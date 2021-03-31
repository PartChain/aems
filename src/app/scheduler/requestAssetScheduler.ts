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

import {RelationshipStatusType} from "../enums/RelationshipStatusType";
import OffChainDBClient from "../domains/OffChainDBClient";
import Logger from '../modules/logger/Logger';
import defaults from '../defaults';
import SmartContractClient from "../domains/SmartContractClient";
import AccessMgmtClient from "../domains/AccessMgmtClient";
import GatewaySingleton from "../modules/gateway/GatewaySingleton";
import _ = require("lodash");
const cron = require('node-cron');

/**
 * Create Scheduler for request asset
 */

export default async function createRequestAssetScheduler() {

    const offChainDBClient = new OffChainDBClient();
    const client = new SmartContractClient();
    const gatewaySingleton: GatewaySingleton = await GatewaySingleton.getInstance();
    const hlfIdentities = gatewaySingleton.getHLFIdentities();

    // TODO At the moment the scheduler only handles parts in status 0/1/2/4, in the future we have to periodically check for parts in status 5/6/7...
    // We need multiple scheduler for the different status types, since we want to check the relationship of an asset at different times,
    // e.g. it does not make sense to retry an asset every 5 minutes if it is not on Fabric
    cron.schedule(defaults.cronjob.status.notInFabric.schedule, async () => {
        Logger.info(`\n`);
        Logger.info(`Scheduler: Time to process assets with status ${RelationshipStatusType.notInFabric}`);
        for (let identity of Object.keys(hlfIdentities)) {
            const mspIDfromJWT = hlfIdentities[identity]["HLF_IDENTITY_MSP_ID"];

            Logger.debug(`[${mspIDfromJWT}] Scheduler: Fetching the components with status ${RelationshipStatusType.notInFabric} `);
            // Order by random to not always try the some relations?
            let notInFabricRelationships: any = await offChainDBClient.getRelationshipsByTransferStatus(RelationshipStatusType.notInFabric, mspIDfromJWT, defaults.cronjob.status.notInFabric.limit, true);

            Logger.debug(`[${mspIDfromJWT}] List of assets with status ${RelationshipStatusType.notInFabric}: ${JSON.stringify(notInFabricRelationships)} `);
            Logger.info(`[${mspIDfromJWT}] Scheduler: ${notInFabricRelationships.length}  Assets with status ${RelationshipStatusType.notInFabric} (maximum: ${defaults.cronjob.status.notInFabric.limit})`);

            // 3. check if the child is part of the PartChain network by now
            await Promise.all(notInFabricRelationships.map(async (childComponent: any) => {
                let childComponentPublicDetails = await client.getPublicAssetDetail(childComponent.child_serial_number_customer, mspIDfromJWT);
                Logger.debug(`[${mspIDfromJWT}] Public info of child Component is ${JSON.stringify(childComponentPublicDetails)}`);
                if (childComponentPublicDetails.status === 200) {
                    // if we find the asset we can set the status to RelationshipStatusType.childInPublicLedger, else we just leave the old status RelationshipStatusType.notInFabric
                    Logger.info(`[${mspIDfromJWT}] Component ${childComponent.child_serial_number_customer} found in PartChain, changing its status to ${RelationshipStatusType.childInPublicLedger}`);
                    childComponentPublicDetails = childComponentPublicDetails.data;
                    // 3.1 Update the MSPID  and status of the components in the relationship table
                    await offChainDBClient.updateRelationshipStatusWithMspID(mspIDfromJWT, childComponent.child_serial_number_customer, RelationshipStatusType.childInPublicLedger, childComponentPublicDetails.mspID);
                } else {
                    await offChainDBClient.updateRelationshipStatus(mspIDfromJWT, childComponent.child_serial_number_customer, RelationshipStatusType.notInFabric);
                }

            }));
        }
        Logger.info(`Scheduler for status ${RelationshipStatusType.notInFabric} is done with this round!`);
    })

    cron.schedule(defaults.cronjob.status.parentShared.schedule, async () => {
        Logger.info(`\n`);
        Logger.info(`Scheduler: Time to process assets with status ${RelationshipStatusType.parentShared}`);
        for (let identity of Object.keys(hlfIdentities)) {
            const mspIDfromJWT = hlfIdentities[identity]["HLF_IDENTITY_MSP_ID"];

            Logger.debug(`[${mspIDfromJWT}] Scheduler: Fetching the components with status ${RelationshipStatusType.parentShared} `);
            let parentSharedRelationships: any = await offChainDBClient.getRelationshipsByTransferStatus(RelationshipStatusType.parentShared, mspIDfromJWT, defaults.cronjob.status.parentShared.limit);

            // In case someone shared their assets with us where we are the child, don`t reset the relationship in case we did not share the child asset yet
            parentSharedRelationships = (parentSharedRelationships.filter((relationship: any) => relationship.child_mspid !== mspIDfromJWT));

            Logger.debug(`[${mspIDfromJWT}] Scheduler: List of assets with status ${RelationshipStatusType.parentShared}: ${JSON.stringify(parentSharedRelationships)} `);
            Logger.info(`[${mspIDfromJWT}] Scheduler:  ${parentSharedRelationships.length} Assets with status ${RelationshipStatusType.parentShared}  (maximum: ${defaults.cronjob.status.parentShared.limit})`);

            // Filter relationships with are only recently updated to parentShared (less than 60 minutes)
            parentSharedRelationships = parentSharedRelationships.filter((rel: any) => (new Date().valueOf() - new Date(rel.last_retry).valueOf()) > 3600000);

            // Change back relationship status back to childInPublicLedger. This relationship will then be picked up again by the other scheduler
            for (let rel of parentSharedRelationships) {
                await offChainDBClient.updateRelationshipStatus(mspIDfromJWT, rel.child_serial_number_customer, RelationshipStatusType.childInPublicLedger);
            }

            Logger.info(`Scheduler for status ${RelationshipStatusType.parentShared} is done with this round! Changed ${parentSharedRelationships.length} assets back to status ${RelationshipStatusType.childInPublicLedger} from ${RelationshipStatusType.parentShared}, as no child was shared`);
        }

    })

    // https://crontab.guru/#*/5_*_*_*_*
    cron.schedule(defaults.cronjob.status.unknown.schedule, async () => {
        Logger.info(`\n`);
        Logger.info(`Scheduler: Time to process assets with status ${RelationshipStatusType.unknown}`);

        for (let identity of Object.keys(hlfIdentities)) {
            const mspIDfromJWT = hlfIdentities[identity]["HLF_IDENTITY_MSP_ID"];

            Logger.debug(`[${mspIDfromJWT}] Scheduler: Fetching the components with status ${RelationshipStatusType.unknown} `);
            // 1. find List of all components with status 0
            let unknownRelationships: any = await offChainDBClient.getRelationshipsByTransferStatus(RelationshipStatusType.unknown, mspIDfromJWT, defaults.cronjob.status.unknown.limit, true);
            unknownRelationships = unknownRelationships.filter((relationship: any) => relationship.child_serial_number_customer != null);

            Logger.debug(`[${mspIDfromJWT}] List of assets with status ${RelationshipStatusType.unknown}: ${JSON.stringify(unknownRelationships)} `);
            Logger.info(`[${mspIDfromJWT}] Scheduler: ${unknownRelationships.length} assets with status ${RelationshipStatusType.unknown} (maximum: ${defaults.cronjob.status.unknown.limit})`);

            // 3. check if the child is part of the PartChain network
            await Promise.all(unknownRelationships.map(async (childComponent: any) => {
                let childComponentDetails = await client.getPublicAssetDetail(childComponent.child_serial_number_customer, mspIDfromJWT);
                Logger.debug(`[${mspIDfromJWT}] Scheduler: Public info of child Component is ${JSON.stringify(childComponentDetails)}`);
                if (childComponentDetails.status === 200) {

                    Logger.info(`[${mspIDfromJWT}] Scheduler: Component ${childComponent.child_serial_number_customer} found in PartChain `);
                    childComponentDetails = childComponentDetails.data;
                    // 3.1 Update the MSPID  and status of the components in the relationship table
                    if (childComponentDetails.mspID === mspIDfromJWT) {
                        // In this special case we are owner of the child, hence we can directly set the status to 3
                        await offChainDBClient.updateRelationshipStatusWithMspID(mspIDfromJWT, childComponent.child_serial_number_customer, RelationshipStatusType.childShared, childComponentDetails.mspID);
                    } else {
                        await offChainDBClient.updateRelationshipStatusWithMspID(mspIDfromJWT, childComponent.child_serial_number_customer, RelationshipStatusType.childInPublicLedger, childComponentDetails.mspID);
                    }
                    return childComponent
                } else {

                    // 3.2 Update status of the components in the relationship table
                    await offChainDBClient.updateRelationshipStatusWithMspID(mspIDfromJWT, childComponent.child_serial_number_customer, RelationshipStatusType.notInFabric);
                    Logger.info(`[${mspIDfromJWT}] Scheduler: ${childComponent.child_serial_number_customer} not found in PartChain `);
                }

            }));

            let childrenInFabric: any[] = await offChainDBClient.getRelationshipsByTransferStatus([RelationshipStatusType.childInPublicLedger, RelationshipStatusType.updatePending], mspIDfromJWT, defaults.cronjob.status.childInPublicLedger.limit);
            Logger.info(`[${mspIDfromJWT}] Scheduler: ${childrenInFabric.length} Assets with status ${RelationshipStatusType.childInPublicLedger} or ${RelationshipStatusType.updatePending} (maximum: ${defaults.cronjob.status.childInPublicLedger.limit})`);
            Logger.debug(`[${mspIDfromJWT}] Relationships with status ${RelationshipStatusType.childInPublicLedger} or ${RelationshipStatusType.updatePending} ${JSON.stringify([].concat(...childrenInFabric))}`);

            // 4. Find Unique MspID for the child components of each parent
            let uniqueParentSerialNumberCustomer = [...new Set(childrenInFabric.map(item => item.parent_serial_number_customer))];
            // 5. Find all the child components for the parent filter by the mspID

            await Promise.all(uniqueParentSerialNumberCustomer.map(async (parentSerialNumberCustomer: any) => {

                // GetParent
                let parentAsset = await client.getAssetDetail(parentSerialNumberCustomer, mspIDfromJWT);
                if (parentAsset.status === 200) {
                    // Get unique mspID for this parent
                    const unsharedRelationshipsForThisParent = childrenInFabric.filter(relationship => relationship.parent_serial_number_customer === parentSerialNumberCustomer);
                    const uniqueMspIDs = [...new Set(unsharedRelationshipsForThisParent.map(relationship => relationship.child_mspid))];

                    const relationshipsForThisParent: any = await offChainDBClient.getRelationshipsByParent(parentSerialNumberCustomer, mspIDfromJWT);

                    // Share Parent
                    for (let mspID of uniqueMspIDs) {
                        let requestAsset =
                            {
                                "serialNumberManufacturer": parentAsset.data.serialNumberManufacturer,
                                "serialNumberCustomer": parentAsset.data.serialNumberCustomer,
                                "serialNumberType": parentAsset.data.serialNumberType,
                                "manufacturerMSPID": mspID, //mspID of the supplier
                                "manufacturer": parentAsset.data.manufacturer,
                                "productionCountryCodeManufacturer": parentAsset.data.productionCountryCodeManufacturer,
                                "partNameManufacturer": parentAsset.data.partNameManufacturer,
                                "partNumberManufacturer": parentAsset.data.partNumberManufacturer,
                                "partNumberCustomer": parentAsset.data.partNumberCustomer,
                                "qualityStatus": parentAsset.data.qualityStatus,
                                "status": parentAsset.data.status,
                                "productionDateGmt": parentAsset.data.productionDateGmt,
                                "manufacturerPlant": parentAsset.data.manufacturerPlant,
                                "manufacturerLine": parentAsset.data.manufacturerLine,
                                "qualityDocuments": parentAsset.data.qualityDocuments,
                                "customFields": parentAsset.data.customFields,
                                "childSerialNumberCustomer": (relationshipsForThisParent.filter((relationship: any) => relationship.child_mspid === mspID).map((relationship: any) => ({
                                    "serialNumberCustomer": relationship.child_serial_number_customer,
                                    "flagged": (relationship.transfer_status == RelationshipStatusType.updatePending)
                                }))),
                            };
                        const requestAssetResponse = await client.requestAsset(requestAsset, mspIDfromJWT);

                        if (requestAssetResponse.status === 200) {
                            for (let rel of unsharedRelationshipsForThisParent.filter(relationship => relationship.child_mspid === mspID)) {
                                await offChainDBClient.updateRelationshipStatus(mspIDfromJWT, rel.child_serial_number_customer, RelationshipStatusType.parentShared);
                            }
                        } else if ((requestAssetResponse.status === 403)) {
                            for (let rel of unsharedRelationshipsForThisParent.filter(relationship => relationship.child_mspid === mspID)) {
                                await offChainDBClient.updateRelationshipStatus(mspIDfromJWT, rel.child_serial_number_customer, RelationshipStatusType.requestAssetNotAllowed);
                            }
                        } else {
                            Logger.error(`[${mspIDfromJWT}] Unexpected error when requesting an asset : ${JSON.stringify(requestAssetResponse)}`);
                        }
                        //else we leave the relationship at status childInPublicLedger and retry it again in the next scheduling run; Alternative: Change relationships to parentExchangeFailure


                    }


                } else {
                    Logger.error(`[${mspIDfromJWT}] Error with parentAsset: ${JSON.stringify(parentAsset)}`);
                }


            }))

        }

        Logger.info(`Scheduler for status ${RelationshipStatusType.unknown} is done with this round!`);

    });

    // In case we do not have access to some private data collections, we check regularly if this has changed
    cron.schedule(defaults.cronjob.status.requestAssetNotAllowed.schedule, async () => {
        Logger.info(`\n`);
        Logger.info(`Scheduler: Time to process assets with status ${RelationshipStatusType.requestAssetNotAllowed}`);
        for (let identity of Object.keys(hlfIdentities)) {
            const mspIDfromJWT = hlfIdentities[identity]["HLF_IDENTITY_MSP_ID"];

            Logger.debug(`[${mspIDfromJWT}] Scheduler: Fetching the components with status ${RelationshipStatusType.requestAssetNotAllowed} `);
            // Order by random to not always try the some relations?
            let requestAssetNotAllowedRelationships: any = await offChainDBClient.getRelationshipsByTransferStatus(RelationshipStatusType.requestAssetNotAllowed, mspIDfromJWT, defaults.cronjob.status.requestAssetNotAllowed.limit, true);

            Logger.debug(`[${mspIDfromJWT}] List of assets with status ${RelationshipStatusType.requestAssetNotAllowed}: ${JSON.stringify(requestAssetNotAllowedRelationships)} `);
            Logger.info(`[${mspIDfromJWT}] Scheduler: ${requestAssetNotAllowedRelationships.length}  Assets with status ${RelationshipStatusType.requestAssetNotAllowed} (maximum: ${defaults.cronjob.status.requestAssetNotAllowed.limit})`);

            //Let`s see which mspID we do not have access to
            const uniqueMspIDs = [...new Set(requestAssetNotAllowedRelationships.map((relationship: any) => relationship.child_mspid))];

            const client = new AccessMgmtClient();
            const ACL = await client.getAccessControlList(mspIDfromJWT);
            // Get mspIDs with status ACTIVE
            if (ACL.status === 200) {
                const activeMspIDs: any = []

                // First Filter for active ACL items, then extract the relevant mspId from entities
                Object.keys(ACL["data"]["ACL"]).forEach(key => {
                    if (ACL["data"]["ACL"][key]["status"] === "ACTIVE") {
                        activeMspIDs.push(_.pull(ACL["data"]["ACL"][key]["entities"], mspIDfromJWT)[0]);
                    }
                })


                // mspIDs which are active but where are relationships in status requestAssetNotAllowed
                const relevantMspIDs = _.intersection(uniqueMspIDs, activeMspIDs);
                Logger.info(`[${mspIDfromJWT}] Newly accessible mspIDs: ${relevantMspIDs}`);

                await Promise.all(requestAssetNotAllowedRelationships.map(async (childComponent: any) => {
                    if (_.includes(relevantMspIDs, childComponent.child_mspid)) {
                        Logger.info(`[${mspIDfromJWT}] Asset ${childComponent.child_serial_number_customer} can now be requested, changing its status from status ${RelationshipStatusType.requestAssetNotAllowed} to ${RelationshipStatusType.unknown}`);
                        await offChainDBClient.updateRelationshipStatus(mspIDfromJWT, childComponent.child_serial_number_customer, RelationshipStatusType.unknown);
                    }
                }));

            } else {
                Logger.error(`[${mspIDfromJWT}] Error when getting ACL: ${JSON.stringify(ACL)}`);
            }

        }
        Logger.info(`Scheduler for status ${RelationshipStatusType.requestAssetNotAllowed} is done with this round!`);
    })

}