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


import { InvestigationSerialNumberStatus,InvestigationStatus } from "../enums/InvestigationStatus";
import OffChainDBClient from "../domains/OffChainDBClient";
import Logger from '../modules/logger/Logger';
import defaults from '../defaults';
import InvestigationClient from "../domains/InvestigationClient";

import GatewaySingleton from "../modules/gateway/GatewaySingleton";
const cron = require('node-cron');

/**
 * create Request Asset For Investigation
 */

export default async function createRequestAssetForInvestigation() {
    const offChainDBClient = new OffChainDBClient();
    const client = new InvestigationClient();
    const gatewaySingleton: GatewaySingleton = await GatewaySingleton.getInstance();
    const hlfIdentities = gatewaySingleton.getHLFIdentities();

    // Scheduler for finding the new serialNumberCustomer of the participating org and add it to the investigation table
    cron.schedule(defaults.cronjob.status.getAllActiveInvestigation.schedule, async () => {
        Logger.info(`\n`);

        Logger.info(`Scheduler: Time to get all the new serialNumberCustomer of investigation in  ${InvestigationStatus.ACTIVE} status`);
        for (let identity of Object.keys(hlfIdentities)) {
            const mspIDFromJWT = hlfIdentities[identity]["HLF_IDENTITY_MSP_ID"];

            Logger.debug(`[${mspIDFromJWT}] Investigation new SNC Scheduler: Fetching the investigations with status ${InvestigationStatus.ACTIVE} `);
            //1. get all active investigation

            let investigationList = await client.getAllInvestigations(mspIDFromJWT);
            investigationList = investigationList.data;
            Logger.debug(`[${mspIDFromJWT}]Investigation new SNC Scheduler : Active investigationList = ${JSON.stringify(investigationList)}`);
            if (investigationList.length != 0) {
                investigationList.map(async (investigation: any) => {
                    if (investigation.status == InvestigationStatus.ACTIVE) {
                        Object.keys(investigation.participatingOrgs).map((org) => {
                            // get information os other participating orgs than ourself 
                            if (org != `${mspIDFromJWT}`) {
                                Logger.debug(`[${mspIDFromJWT}] Investigation new SNC Scheduler: Investigation ID = ${investigation.investigationID}`);
                                Logger.debug(`[${mspIDFromJWT}] Investigation new SNC Scheduler: Component Serial Number for participating org  ${org}  is ${investigation["participatingOrgs"][`${org}`]['componentsSerialNumbers']} `);

                                if (investigation["participatingOrgs"][`${org}`]['componentsSerialNumbers'].length > 0) {
                                    investigation["participatingOrgs"][`${org}`]['componentsSerialNumbers'].map(async (serialNumberCustomer: string) => {
                                        let serialNumberCustomerCheck: any = await offChainDBClient.getRelationshipBySerialNumberCustomerForInvestigation(serialNumberCustomer, mspIDFromJWT);
                                        Logger.debug(`[${mspIDFromJWT}] Investigation new SNC Scheduler: serialNumberCustomerCheck = ${serialNumberCustomerCheck} for serialNumberCustomer = ${serialNumberCustomer}`);
                                        if (serialNumberCustomerCheck.length == 0) {
                                            await offChainDBClient.addAssetToInvestigation(mspIDFromJWT, investigation.investigationID, serialNumberCustomer, org,InvestigationSerialNumberStatus.assetAddedToInvestigationTable);
                                        }
                                    })
                                }
                            }
                        })
                    }

                })
            }
        }
    })


    // Scheduler for requesting assets for serialNumberCustomer with status as 11
    cron.schedule(defaults.cronjob.status.requestAssetForInvestigation.schedule, async () => {
        Logger.info(`\n`);

        Logger.info(`Scheduler: Time to request for serialNumberCustomer as part of investigation with status 11`);
        for (let identity of Object.keys(hlfIdentities)) {
            const mspIDFromJWT = hlfIdentities[identity]["HLF_IDENTITY_MSP_ID"];
            Logger.debug(`[${mspIDFromJWT}] Investigation SNC request Scheduler: Fetching the serialNumberCustomer with status  false from the investigation table`);
            let serialNumberCustomerList: any = await offChainDBClient.getRelationshipByStatusForInvestigation(mspIDFromJWT, InvestigationSerialNumberStatus.assetAddedToInvestigationTable);

            Logger.debug(`[${mspIDFromJWT}]Investigation SNC request Scheduler : serialNumberCustomerList = ${JSON.stringify(serialNumberCustomerList)}`);
            if (serialNumberCustomerList.length != 0) {
                Logger.debug(`[${mspIDFromJWT}]Investigation SNC request Scheduler : request asset for investigation `);
                serialNumberCustomerList.map(async (asset: any) => {
                    let requestAsset =
                    {
                        "serialNumberCustomer": asset.investigation_serial_number_customer,
                        "targetOrg": asset.org_mspid,
                        "investigationID": asset.investigation_id
                    };
                    const requestAssetForInvestigationResponse = await client.requestAssetForInvestigation(requestAsset, mspIDFromJWT);
                    Logger.debug(`[${mspIDFromJWT}]Investigation SNC request Scheduler : request asset response for investigation = ${JSON.stringify(requestAssetForInvestigationResponse)}`);
                    if (requestAssetForInvestigationResponse.status === 200) {
                        Logger.debug(`[${mspIDFromJWT}] Investigation SNC request Scheduler : updating asset information in the investigation table`);

                        await offChainDBClient.updateRelationshipStatusForInvestigation(asset.investigation_id, asset.investigation_serial_number_customer, InvestigationSerialNumberStatus.assetDetailsRequested, mspIDFromJWT,"update");

                    }
                })
            }else{
                Logger.info(`[${mspIDFromJWT}] Investigation SNC request Scheduler :  No assets to request`);
            }

        }
    })





    // Retry for the request asset as part investigation for all assets in status 12
    cron.schedule(defaults.cronjob.status.retryRequestAssetForInvestigation.schedule, async () => {
        Logger.info(`\n`);
        Logger.info(`Scheduler: Retry for request for asset as part of investigation`);
        for (let identity of Object.keys(hlfIdentities)) {
            const mspIDFromJWT = hlfIdentities[identity]["HLF_IDENTITY_MSP_ID"];
            Logger.debug(`[${mspIDFromJWT}] Investigation SNC retry request Scheduler: Fetching the serialNumberCustomer with status  12 from the investigation table`);
            let serialNumberCustomerList: any = await offChainDBClient.getRelationshipByStatusForInvestigation(mspIDFromJWT, InvestigationSerialNumberStatus.assetDetailsRequested);
            // Filter serialnumbercustomer with are only recently updated to assetDetailsRequested (less than 60 minutes)
            serialNumberCustomerList = serialNumberCustomerList.filter((rel: any) => (new Date().valueOf() - new Date(rel.investigation_last_retry).valueOf()) > 3600000);
            Logger.debug(`[${mspIDFromJWT}]Investigation SNC retry request Scheduler : serialNumberCustomerList = ${JSON.stringify(serialNumberCustomerList)} `);

            if (serialNumberCustomerList.length != 0) {
                Logger.debug(`[${mspIDFromJWT}]Investigation SNC retry request Scheduler : request asset for investigation `);
                serialNumberCustomerList.map(async (asset: any) => {
                    let requestAsset =
                    {
                        "serialNumberCustomer": asset.investigation_serial_number_customer,
                        "targetOrg": asset.org_mspid,
                        "investigationID": asset.investigation_id
                    };
                    const requestAssetForInvestigationResponse = await client.requestAssetForInvestigation(requestAsset, mspIDFromJWT);
                    Logger.debug(`[${mspIDFromJWT}]Investigation SNC retry request Scheduler : request asset response for investigation = ${JSON.stringify(requestAssetForInvestigationResponse)}`);
                    if (requestAssetForInvestigationResponse.status === 200) {
                        Logger.debug(`[${mspIDFromJWT}]Investigation SNC retry request Scheduler : updating asset information in the investigation table`);

                        await offChainDBClient.updateRelationshipStatusForInvestigation(asset.investigation_id, asset.investigation_serial_number_customer, InvestigationSerialNumberStatus.assetDetailsRequested, mspIDFromJWT,"retry");

                    }
                })
            }


        }
    })

}


