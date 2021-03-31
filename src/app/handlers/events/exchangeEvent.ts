/*
 * Copyright 2021 The PartChain Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Logger from "../../modules/logger/Logger";
import SmartContractClient from "../../domains/SmartContractClient";
import {RelationshipStatusType} from "../../enums/RelationshipStatusType";
import OffChainDBClient from "../../domains/OffChainDBClient";
import GatewaySingleton from "../../modules/gateway/GatewaySingleton";

/**
 * Exchange asset event handlers of smartcontract
 * @param exchangeEventDetails
 *
 * 1. Fetch the shared child component details
 * 2. Compute the full hash and verify with the data available in the public state
 * 3. Write to OffChainDB
 */

export default async function exchangeAssetEvent(exchangeEventDetails: string) {
    try {
        const client = new SmartContractClient();
        const exchangeEvent = JSON.parse(exchangeEventDetails);
        const ParentSerialNumberCustomer = exchangeEvent.key;
        const mspID = exchangeEvent.mspID;
        const gatewaySingleton: GatewaySingleton = await GatewaySingleton.getInstance();
        const hlfIdentities = gatewaySingleton.getHLFIdentities();

        Logger.info(`ParentSerialNumberCustomer ${ParentSerialNumberCustomer}, Target MSP ${mspID})`);

        for (let identity of Object.keys(hlfIdentities)) {

            const mspIDFromJWT = hlfIdentities[identity]["HLF_IDENTITY_MSP_ID"];
            Logger.info(`Trying to process event exchangeAssetEvent for mspID ${mspIDFromJWT}`);

            if (mspIDFromJWT == mspID) {
                // Retrieving the shared child component Information
                let exchangedAssetEventDetails = await client.getAssetEventDetail(
                    ParentSerialNumberCustomer,
                    mspIDFromJWT
                );
                Logger.info(`[${mspIDFromJWT}] Asset Event details ${JSON.stringify(exchangedAssetEventDetails)}`);

                if (exchangedAssetEventDetails.status === 404) {
                    //TODO Handle this properly. At the moment we skip the event in case of 404. If we implement
                    // the event replay functionality this needs to revisited and we can replay the missed event!
                    // In the normal exchange case this does not matter, but in case of updateAsset we would loose the update!
                    Logger.warn(`[${mspIDFromJWT}] We could not find ${ParentSerialNumberCustomer} in our PDC! Skipping the event.`);
                } else {
                    const exchangedAsset = exchangedAssetEventDetails.data;

                    if (exchangedAsset.hasOwnProperty("serialNumberManufacturer")) {
                        Logger.info(`[${mspIDFromJWT}] Asset details = ${JSON.stringify(exchangedAsset)}`);
                        Logger.info(`[${mspIDFromJWT}] Validating the component information `);
                        // Validating Child component shared by the requested Org
                        const validate_response = await client.validateAsset(
                            exchangedAsset,
                            mspIDFromJWT
                        );

                        Logger.info(`[${mspIDFromJWT}] Child Component validation details = ${JSON.stringify(validate_response)}`);
                        if (validate_response.data.result == true) {
                            Logger.info(`[${mspIDFromJWT}] Child component verification is successful now storing the data in the offchainDB`);
                            // Store Asset to Off-chain DB
                            // If this fails, the asset stays in status 2 and is retried again soon
                            const offChainDBClient = new OffChainDBClient();
                            offChainDBClient.upsertAsset(exchangedAsset, mspIDFromJWT, exchangedAsset.mspID).then(() => {
                                const offChainDBClient = new OffChainDBClient();
                                // The exchanged asset can either be in a parent relationship or in a child relationship.
                                // If the exchanged asset is a parent we can update the relationship,
                                // else if the exchanged asset is a child then the exchangeAsset was called as part of the updateAsset process,
                                // therefore we do not have anything to update
                                offChainDBClient.updateRelationshipStatus(mspIDFromJWT, exchangedAsset.serialNumberCustomer, RelationshipStatusType.childShared).then(() => {
                                    if (exchangedAsset.qualityStatus === "NOK") {
                                        //If Asset is NOK, look for a parent which we also have to flag as NOK
                                        offChainDBClient.getAssetParent(exchangedAsset.serialNumberCustomer, mspIDFromJWT).then((r: any) => {
                                            r.parents.forEach(
                                                async (parent: any) => {
                                                    if (parent.mspid === mspIDFromJWT) {
                                                        Logger.info(`[${mspIDFromJWT}] Asset ${exchangedAsset.serialNumberCustomer} was changed to NOK, also changing its parent to NOK now!`);
                                                        const parentNOK = parent;
                                                        parentNOK.qualityStatus = "NOK";
                                                        client.updateAsset(parentNOK, mspIDFromJWT, true)
                                                            .then(r => Logger.info(`[${mspIDFromJWT}] Successfully updated parent ${JSON.stringify(parentNOK)} to NOK`));
                                                    }
                                                })

                                        })


                                    }
                                });


                            })

                        } else {
                            Logger.warn(`[${mspIDFromJWT}] Child component details are not fully shared, storing Child anyway with status ${RelationshipStatusType.childHashValidationFailure}`);
                            const offChainDBClient = new OffChainDBClient();
                            offChainDBClient.upsertAsset(exchangedAsset, mspIDFromJWT, exchangedAsset.mspID).then(() => {
                                const offChainDBClient = new OffChainDBClient();
                                offChainDBClient.updateRelationshipStatus(mspIDFromJWT, exchangedAsset.serialNumberCustomer, RelationshipStatusType.childHashValidationFailure);
                            })
                        }
                    }
                }


            } else {
                Logger.info(`[${mspIDFromJWT}] Rejecting the exchange event request since its addressed to org ${mspID}`);
            }

        }
    } catch (error) {
        Logger.error(`Error occurred in exchangeAssetEvent ${error}`);
    }
}
