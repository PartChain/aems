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
import GatewaySingleton from "../../modules/gateway/GatewaySingleton";
import defaults from '../../defaults';
import OffChainDBClient from "../../domains/OffChainDBClient";
/**
 * Request asset event handlers of smartcontract
 * @param requestInvestigationEventDetails
 * 1. decrypt the serialNumber customer and mspID
 * 2. validate if the requesting org is part of investigation
 * 3. verify if any componentSerial Numbers are part of investigation
 * 4. add the component serial number along with the asset information
 * 5. invoke the chaincode to share the asset information
 * @param mspIDFromJWT
 */

export default async function requestInvestigationEvent(requestInvestigationEventDetails: string, mspIDFromJWT: string) {
    try {
        Logger.info(`Called requestInvestigationEvent`);
        const requestInvestigationEvent = JSON.parse(requestInvestigationEventDetails);
        const {
            investigationID,
            key,
            encryptedMspID,
            mspID
        } = requestInvestigationEvent
        Logger.info(`[${mspIDFromJWT}] investigationID = ${investigationID} , Key = ${key}, encryptedMspID = ${encryptedMspID} and MSP = ${mspID} `);
        const gatewaySingleton: GatewaySingleton = await GatewaySingleton.getInstance();
        const hlfIdentities = gatewaySingleton.getHLFIdentities();
        for (let identity of Object.keys(hlfIdentities)) {
            const mspIDFromJWT = hlfIdentities[identity]["HLF_IDENTITY_MSP_ID"];
            Logger.info(`[${mspIDFromJWT}] Trying to process event requestInvestigationEvent for mspID ${mspIDFromJWT}`);
            if (mspIDFromJWT === mspID) {
                // processing the request asset for investigation
                await processRequestInvestigationAssetEvent(investigationID, key, encryptedMspID, mspIDFromJWT);

            }
        }
        Logger.info(`requestInvestigationEvent:end`);
    } catch (error) {

        Logger.info(`requestInvestigationEvent:end`);
        Logger.error(`Error occurred in requestInvestigationEvent ${error}`);
    }
}


/**
 * process Request Investigation Asset Event
 * @param investigationID 
 * @param serialNumberCustomer 
 * @param encryptedMspID 
 * @param mspIDFromJWT 
 */

const processRequestInvestigationAssetEvent = async (investigationID: string, serialNumberCustomer: string, encryptedMspID: string, mspIDFromJWT: string) => {
    const client = new SmartContractClient();
    const offChainDBClient = new OffChainDBClient();
    // 1. decrypt the serialNumberCustomer
    Logger.info(`[${mspIDFromJWT}] processRequestInvestigationAssetEvent`);
    const decryptSerialNumberCustomerRequest = { investigationID, data: serialNumberCustomer, type: 'ASSET' };
    Logger.debug(`[${mspIDFromJWT}] processRequestInvestigationAssetEvent: decryptSerialNumberCustomerRequest = ${JSON.stringify(decryptSerialNumberCustomerRequest)}`);
    const decryptedSerialNumberCustomerResponse = await client.processTransaction('decryptDataForInvestigation', defaults.hlfDefaultMspID, [decryptSerialNumberCustomerRequest], 'submit');
    Logger.debug(`[${mspIDFromJWT}] processRequestInvestigationAssetEvent:  decryptedSerialNumberCustomer = ${JSON.stringify(decryptedSerialNumberCustomerResponse)}`);
    const decryptedSerialNumberCustomer = decryptedSerialNumberCustomerResponse[0].data[0];
    Logger.debug(`[${mspIDFromJWT}] processRequestInvestigationAssetEvent: decryptedSerialNumberCustomer = ${decryptedSerialNumberCustomer}`);
    // 2. decrypt the MSP 
    const decryptMspRequest = { investigationID, data: encryptedMspID, type: 'MSP' };
    const decryptedMspResponse = await client.processTransaction('decryptDataForInvestigation', defaults.hlfDefaultMspID, [decryptMspRequest], 'submit');
    Logger.debug(`[${mspIDFromJWT}]processRequestInvestigationAssetEvent:  decryptedSerialNumberCustomer = ${JSON.stringify(decryptedMspResponse)}`);
    const decryptedMsp = decryptedMspResponse[0].data[0];
    Logger.debug(`[${mspIDFromJWT}] processRequestInvestigationAssetEvent: decryptedMsp = ${decryptedMsp}`);
    // 3. Get Investigation Details 
    const investigationPublicRequest = { investigationID };
    const investigationPublicResponse = await client.processTransaction('getPublicInvestigation', defaults.hlfDefaultMspID, [investigationPublicRequest], 'eval');
    Logger.debug(`[${mspIDFromJWT}] processRequestInvestigationAssetEvent: investigationPublicDetails = ${JSON.stringify(investigationPublicResponse)}`);
    // 4. check if the requesting Org is part of investigation
    const publicInvestigation = investigationPublicResponse[0].data;
    Logger.debug(`[${mspIDFromJWT}] processRequestInvestigationAssetEvent: investigationPublicDetails = ${JSON.stringify(publicInvestigation)}`);
    //5. validate if the requesting org is part of the investigation
    const checkOrg = publicInvestigation.participatingOrgs.hasOwnProperty(decryptedMsp);
    const checkSerialNumberCustomer = publicInvestigation.participatingOrgs[mspIDFromJWT]["componentsSerialNumbers"].filter((requestingSerialNumberCustomer: string) => {
        return requestingSerialNumberCustomer === decryptedSerialNumberCustomer;
    });
    if (checkOrg && checkSerialNumberCustomer.length > 0) {
        Logger.debug(`[${mspIDFromJWT}] ${decryptedMsp} & ${decryptedSerialNumberCustomer} is part of investigation`);
        //6. Get the information about the asset.     
        let assetDetails = await client.getAssetDetail(decryptedSerialNumberCustomer, mspIDFromJWT);
        assetDetails = assetDetails.data;
        Logger.debug(`[${mspIDFromJWT}]processRequestInvestigationAssetEvent: requesting asset full details ${JSON.stringify(assetDetails)}`);
        const assetInfo = JSON.stringify(assetDetails);
        const exchangeRequest = {
            investigationID,
            assetInfo,
            targetOrg: decryptedMsp
        };
        Logger.info(`[${mspIDFromJWT}] processRequestInvestigationAssetEvent: Exchange asset information for investigation = ${JSON.stringify(exchangeRequest)}`);
        // 7. exchange asset information to the requesting org
        const response = await client.processTransaction('exchangeAssetForInvestigation', mspIDFromJWT, [exchangeRequest], 'submit');
        Logger.info(`processRequestInvestigationAssetEvent: exchangeAssetForInvestigation Response = ${JSON.stringify(response)}`);

        //8. make entry to investigation relationship 
        Logger.debug(`processRequestInvestigationAssetEvent: Insert data to the investigation relationship`);
        await offChainDBClient.addAssetToInvestigationRealtionship(mspIDFromJWT, investigationID, decryptedSerialNumberCustomer, decryptedMsp);
    }
}