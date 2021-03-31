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
import OffChainDBClient from "../../domains/OffChainDBClient";
import { RelationshipStatusType } from "../../enums/RelationshipStatusType";
import GatewaySingleton from "../../modules/gateway/GatewaySingleton";
import { InvestigationStatus } from '../../enums/InvestigationStatus'
/**
 * Request asset event handlers of smartcontract
 * @param requestEventDetails
 *
 * 1. Fetch the shared parent component details
 * 2. Compute the shared hash and verify with the data available in the public state
 * 3. Write to OffChainDB
 * 4. Get the mentioned child component in the request
 * 5. Share the child component with requested Organisation
 */

export default async function requestEvent(requestEventDetails: string) {
    try {
        const client = new SmartContractClient();
        const requestEvent = JSON.parse(requestEventDetails);
        const key = requestEvent.key;
        const mspID = requestEvent.mspID;
        Logger.info(`requestEvent of key ${key} of mspID ${mspID}`);
        const gatewaySingleton: GatewaySingleton = await GatewaySingleton.getInstance();
        const hlfIdentities = gatewaySingleton.getHLFIdentities();

        for (let identity of Object.keys(hlfIdentities)) {
            const mspIDFromJWT = hlfIdentities[identity]["HLF_IDENTITY_MSP_ID"];
            Logger.info(`Trying to process event requestEvent for mspID ${mspIDFromJWT}`);
            if (mspIDFromJWT === mspID) {
                // Retrieving the shared Parent component Information
                const assetEventDetails = await client.getAssetEventDetail(key, mspIDFromJWT);
                Logger.info(`[${mspIDFromJWT}] Asset Event details ${JSON.stringify(assetEventDetails)}`);
                if (
                    assetEventDetails.hasOwnProperty("data") &&
                    assetEventDetails.data.hasOwnProperty("serialNumberCustomer")
                ) {
                    await processRequestAssetEvent(assetEventDetails, mspIDFromJWT);
                } else if (
                    assetEventDetails.hasOwnProperty("data") &&
                    assetEventDetails.data.hasOwnProperty("investigationID")
                ) {
                    await processInvestigation(assetEventDetails.data, mspIDFromJWT);
                }

                else {
                    Logger.warn(`[${mspIDFromJWT}] Response from calling SmartContract getAssetEventDetail is missing 
                            the asset.data, asset.data.serialNumberCustomer or asset.investigationID key. This could be due 
                            to 2 reasons: The asset/Investigation is simply not found or there is some problem with getAssetEventDetail`);
                }
            } else {
                Logger.info(`[${mspIDFromJWT}] Rejecting the request event request since its addressed to org ${mspID}`);
            }
        }
    } catch (error) {
        Logger.error(`Error occurred in RequestComponentEvent ${error}`);
    }
}


/**
 * Process Request Asset event
 * @param assetEventDetails 
 * @param mspIDFromJWT 
 */


const processRequestAssetEvent = async (assetEventDetails: any, mspIDFromJWT: string) => {
    Logger.info(`called processRequestAssetEvent`);
    const client = new SmartContractClient();
    const offChainDBClient = new OffChainDBClient();
    let asset = assetEventDetails.data;
    Logger.debug(`[${mspIDFromJWT}] Validating the parent component information`);
    // Validating Parent component shared by the requested Org
    const validate_response = await client.validateAsset(
        asset,
        mspIDFromJWT
    );

    Logger.info(`[${mspIDFromJWT}] Parent Validation response  = ${JSON.stringify(validate_response)}`);
    Logger.debug(`[${mspIDFromJWT}] Fetching the child component details`);

    asset["componentsSerialNumbers"] = asset.childSerialNumberCustomer.map((r: any) => r.serialNumberCustomer);

    const flaggedComponentSerialNumbers: Array<string> = asset.childSerialNumberCustomer.filter((r: any) => r.flagged).map((r: any) => r.serialNumberCustomer);

    // Get the requested children which are not shared yet
    const relationshipsThisParent: any = await offChainDBClient.getRelationshipsByParent(asset.serialNumberCustomer, mspIDFromJWT);
    // For now we allow sharing a child multiple times
    // TODO Think about this
    //const sharedChildrenForThisParent = relationshipsThisParent ? relationshipsThisParent.filter((relationship: any) => relationship.transfer_status === RelationshipStatusType.childShared).map((relationship: any) => relationship.child_serial_number_customer): [];
    const sharedChildrenForThisParent: Array<string> = [];

    const unsharedChildrenForThisParent = asset.componentsSerialNumbers.filter((item: any) => !sharedChildrenForThisParent.includes(item));

    if (validate_response.data.result == true) {
        Logger.info(`[${mspIDFromJWT}] Parent verification is successful now storing the data in the offchainDB`);

        // Store Asset to Off-chain DB
        const relationshipExtras = Object.create({});
        for (let child of asset.componentsSerialNumbers) {
            relationshipExtras[child] =
                {
                    "child_mspid": mspIDFromJWT,
                    "transfer_status": RelationshipStatusType.parentShared
                };
        }
        // If this fails the parts will not get exchanged and the requester will request it again soon
        const offChainDBClient = new OffChainDBClient();
        await offChainDBClient.upsertAsset(asset, mspIDFromJWT, asset.mspID, relationshipExtras);

        // Share all requested children
        for (let child of unsharedChildrenForThisParent) {
            let childDetails = await client.getAssetDetail(child, mspIDFromJWT);

            if (childDetails.status === 200) {
                childDetails = childDetails.data;
                Logger.info(`[${mspIDFromJWT}] Child component details  = ${JSON.stringify(childDetails)}`);

                //Check if item was flagged by parent and change its status
                if (flaggedComponentSerialNumbers.includes(childDetails.serialNumberCustomer)) {
                    Logger.warn(`[${mspIDFromJWT}] Asset ${childDetails.serialNumberCustomer} was flagged by parent`);
                    //update asset with flagged status
                    childDetails.qualityStatus = "FLAG";
                    await client.updateAsset(childDetails, mspIDFromJWT, true);
                    childDetails = await client.getAssetDetail(child, mspIDFromJWT);
                    childDetails = childDetails.data;
                }
                // We don`t share componentSerialNumbers
                childDetails.componentsSerialNumbers = [];

                Logger.info(`[${mspIDFromJWT}] Storing child component details on the parent private data collection of ${asset.mspID}`);
                const exchangeAssetResponse = await client.exchangeAsset(
                    asset.mspID,
                    childDetails.serialNumberCustomer,
                    JSON.stringify(childDetails),
                    mspIDFromJWT
                );
                Logger.info(`[${mspIDFromJWT}] ExchangeAsset Response = ${JSON.stringify(exchangeAssetResponse)}`);

                if (exchangeAssetResponse.status === 200) {
                    await offChainDBClient.updateRelationshipStatus(mspIDFromJWT, childDetails.serialNumberCustomer, RelationshipStatusType.childShared);
                } else {
                    Logger.error(`[${mspIDFromJWT}] Error when calling exchange Asset ${JSON.stringify(exchangeAssetResponse)}`);
                    await offChainDBClient.updateRelationshipStatus(mspIDFromJWT, childDetails.serialNumberCustomer, RelationshipStatusType.childExchangeFailure);
                }
            }
            else {
                Logger.error(`[${mspIDFromJWT}] We could not find the requested child ${child}! Therefore we cannot share it!`);
            }


        }

    } else {
        Logger.warn(`[${mspIDFromJWT}] Parent component verification failed, storing Asset anyway with status ${RelationshipStatusType.parentHashValidationFailure}, but not sharing anything with parent!`);
        const relationshipExtras = Object.create({});
        for (let child of asset.componentsSerialNumbers) {
            relationshipExtras[child] =
                {
                    "child_mspid": mspIDFromJWT,
                    "transfer_status": RelationshipStatusType.parentHashValidationFailure
                };
        }
        await offChainDBClient.upsertAsset(asset, mspIDFromJWT, asset.mspID, relationshipExtras);
    }

}

 /**
  * Process investigation
  * @param eventDetails 
  * @param mspIDFromJWT 
  * 
  * 1. Get the private state the investigation
  * 2. Get the key1 , key2 and iv of the investigation
  * 3. Get the public state of the investigation 
  * 4. Check for the org  approved status 
  * 5. Share the key with the organisation
  */


const processInvestigation = async (eventDetails: any, mspIDFromJWT: string) => {
    Logger.info(`[${mspIDFromJWT}] In processInvestigation`);
    const { investigationID } = eventDetails;
    Logger.info(`[${mspIDFromJWT}] investigationID = ${investigationID}`);
    const client = new SmartContractClient();
    const request = { investigationID };
    // Get the private state the investigation
    // get the key1 , key2 and iv of the investigation
    // TO DO change the processTransaction call 
    const investigationPrivateDetails = await client.processTransaction('getPrivateInvestigation', mspIDFromJWT, [request], 'eval');
    Logger.info(`[${mspIDFromJWT}] investigationPrivateDetails = ${JSON.stringify(investigationPrivateDetails)}`);
    const iv = investigationPrivateDetails[0].data.iv;
    const secret1 = investigationPrivateDetails[0].data.secret1;
    const secret2 = investigationPrivateDetails[0].data.secret2;
    Logger.info(`[${mspIDFromJWT}] iv = ${iv} , secret1 = ${secret1} and secret2 = ${secret2}`);
    // Get the public state of the investigation 

    // TO DO change the processTransaction call 
    const investigationPublicDetails = await client.processTransaction('getPublicInvestigation', mspIDFromJWT, [request], 'eval');
    // const investigationPublicDetails = await client.getPublicInvestigationDetails( investigationID,mspIDFromJWT)
    Logger.info(`[${mspIDFromJWT}] investigationPublicDetails = ${JSON.stringify(investigationPublicDetails)}`);
    // Check for the org  approved status 
    if (
        investigationPublicDetails[0].hasOwnProperty("data") &&
        investigationPublicDetails[0].data.hasOwnProperty("participatingOrgs")
    ) {
        const participatingOrgs = investigationPublicDetails[0].data.participatingOrgs;
        // Checking the status of each org in the investigation
        Object.keys(participatingOrgs).forEach(async function (targetOrg) {
            Logger.info(`[${mspIDFromJWT}] MSP id of the participating orgs : ${targetOrg}, value: ${participatingOrgs[targetOrg].status}`);
            //Accept the investigation
            if (participatingOrgs[targetOrg].status == InvestigationStatus.ACCEPT) {
                let shareKeyRequest = { investigationID, secret1, secret2, targetOrg, iv };
                // TO DO change the processTransaction call 
                // share the key with the organisation
                const response = await client.processTransaction('shareInvestigationKey', mspIDFromJWT, [shareKeyRequest], 'submit');
                Logger.info(`[${mspIDFromJWT}] shareInvestigationKey Response = ${JSON.stringify(response)}`);
                shareKeyRequest = null;
            }
        })

    } else {
        Logger.info(`[${mspIDFromJWT}] investigation details = ${JSON.stringify(investigationPublicDetails[0])}`);
    }


}