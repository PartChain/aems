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
import { InvestigationSerialNumberStatus } from "../../enums/InvestigationStatus";
import OffChainDBClient from "../../domains/OffChainDBClient";
import GatewaySingleton from "../../modules/gateway/GatewaySingleton";

import defaults from '../../defaults';
/**
 * Exchange asset event handlers for investigation of smartcontract
 *1. get the event details
 *2. Decrypt the MSP and SerialNumberCustomer
 *3. Fetch the shared child asset details
 *4. Validate the hash of the shared Asset
 *5. Store the data in the offchainDB
 * @param exchangeInvestigationEventDetails
 */

export default async function exchangeAssetForInvestigationEvent(exchangeInvestigationEventDetails: string) {
    try {
        Logger.info(`exchangeAssetForInvestigationEvent:start`);
        const exchangeInvestigationEvent = JSON.parse(exchangeInvestigationEventDetails);
        const {
            investigationID,
            key,
            encryptedMspID,
            mspID
        } = exchangeInvestigationEvent
        Logger.debug(`investigationID = ${investigationID} , Key = ${key}, encryptedMspID = ${encryptedMspID} and MSP = ${mspID} `);

        const gatewaySingleton: GatewaySingleton = await GatewaySingleton.getInstance();
        const hlfIdentities = gatewaySingleton.getHLFIdentities();
        for (let identity of Object.keys(hlfIdentities)) {

            const mspIDFromJWT = hlfIdentities[identity]["HLF_IDENTITY_MSP_ID"];
            Logger.info(`[${mspIDFromJWT}] Trying to process event exchangeAssetEvent for mspID ${mspIDFromJWT}`);

            if (mspIDFromJWT == mspID) {
                await processExchangeInvestigationAssetEvent(investigationID, key, encryptedMspID, mspIDFromJWT);

            } else {
                Logger.info(`[${mspIDFromJWT}] Rejecting the exchange investigation event request since its addressed to org ${mspID}`);
            }
        }
    } catch (error) {
        Logger.error(`Error occurred in exchangeAssetEvent ${error}`);
    }
}

/**
 * process Exchange Investigation Asset Event
 * @param investigationID
 * @param key
 * @param encryptedMspID
 * @param mspIDFromJWT
 */


const processExchangeInvestigationAssetEvent = async (investigationID: string, key: string, encryptedMspID: string, mspIDFromJWT: string) => {

    Logger.info(`ExchangeInvestigationAssetEvent: start`);
    const client = new SmartContractClient();
    // 1. decrypt the Key 
    const decryptKeyRequest = { investigationID, data: key, type: 'ASSET' };
    const decryptedKeyResponse = await client.processTransaction('decryptDataForInvestigation', defaults.hlfDefaultMspID, [decryptKeyRequest], 'submit');
    Logger.debug(`[${mspIDFromJWT}] ExchangeInvestigationAssetEvent:  decryptedKey = ${JSON.stringify(decryptedKeyResponse)}`);
    const decryptedKey = decryptedKeyResponse[0].data[0];
    Logger.debug(`[${mspIDFromJWT}] ExchangeInvestigationAssetEvent:  decryptedKey = ${decryptedKey}`);
    // 2. decrypt the MSP 
    const decryptMspRequest = { investigationID, data: encryptedMspID, type: 'MSP' };
    const decryptedMspResponse = await client.processTransaction('decryptDataForInvestigation', defaults.hlfDefaultMspID, [decryptMspRequest], 'submit');
    Logger.debug(`[${mspIDFromJWT}] ExchangeInvestigationAssetEvent:  decryptedKey = ${JSON.stringify(decryptedMspResponse)}`);
    const decryptedMsp = decryptedMspResponse[0].data[0];
    Logger.debug(`[${mspIDFromJWT}] ExchangeInvestigationAssetEvent:  decryptedMsp = ${decryptedMsp}`);

    //3. Get the information about the asset.     
    let assetDetails = await client.getAssetEventDetail(decryptedKey, mspIDFromJWT);
    assetDetails = assetDetails.data;
    Logger.debug(`[${mspIDFromJWT}] ExchangeInvestigationAssetEvent:  Exchange asset full details ${JSON.stringify(assetDetails)}`);

    // 4. Get Investigation Details 
    const investigationPublicRequest = { investigationID };
    const investigationPublicResponse = await client.processTransaction('getPublicInvestigation', defaults.hlfDefaultMspID, [investigationPublicRequest], 'eval');
    Logger.debug(`[${mspIDFromJWT}] ExchangeInvestigationAssetEvent:  investigationPublicDetails = ${JSON.stringify(investigationPublicResponse)}`);
    // 5. check if the requesting Org is part of investigation
    const publicInvestigation = investigationPublicResponse[0].data;
    Logger.debug(`[${mspIDFromJWT}] ExchangeInvestigationAssetEvent:  investigationPublicDetails = ${JSON.stringify(publicInvestigation)}`);
    //6. validate if the requesting org is part of the investigation

    let validateResponse = await client.validateAsset(
        assetDetails,
        mspIDFromJWT
    );
    Logger.info(`[${mspIDFromJWT}] ExchangeInvestigationAssetEvent:  validate_response = ${JSON.stringify(validateResponse)}`);
    if (validateResponse.data.result == true) {
        const checkOrg = publicInvestigation.participatingOrgs.hasOwnProperty(decryptedMsp);

        if (assetDetails.hasOwnProperty("serialNumberCustomer")) {
            const checkSerialNumberCustomer = publicInvestigation.participatingOrgs[decryptedMsp]["componentsSerialNumbers"].filter((requestingSerialNumberCustomer: string) => {
                return requestingSerialNumberCustomer === assetDetails.serialNumberCustomer;
            })
            Logger.debug(`[${mspIDFromJWT}] ExchangeInvestigationAssetEvent: checkOrg = ${JSON.stringify(checkOrg)} and checkSerialNumberCustomer = ${JSON.stringify(checkSerialNumberCustomer)}`);
            if (checkOrg && checkSerialNumberCustomer.length > 0) {
                Logger.debug(`[${mspIDFromJWT}] ${decryptedMsp} & ${assetDetails.serialNumberCustomer} is part of investigation`);
                //7. Storing to offChainDB
                const offChainDBClient = new OffChainDBClient();
                Logger.debug(`[${mspIDFromJWT}] processExchangeInvestigationAssetEvent: storing  ${assetDetails.serialNumberCustomer} to offchainDB`);
                await offChainDBClient.upsertAsset(assetDetails, mspIDFromJWT, assetDetails.mspID);

                //8. Updating status for the investigation table to status 13
                Logger.debug(`[${mspIDFromJWT}] processExchangeInvestigationAssetEvent: updating the status od  ${assetDetails.serialNumberCustomer} to 13 in investigation table`);
                await offChainDBClient.updateRelationshipStatusForInvestigation(investigationID, assetDetails.serialNumberCustomer, InvestigationSerialNumberStatus.assetDetailsReceived, mspIDFromJWT, "update");

            } else {
                Logger.error(`[${mspIDFromJWT}] ExchangeInvestigationAssetEvent: Validation failed for exchange asset for investigation`);
            }

        } else {
            Logger.error(`[${mspIDFromJWT}] ExchangeInvestigationAssetEvent: The exchanged asset does not have serialNumberCustomer `);

        }

    } else {
        Logger.error(`[${mspIDFromJWT}] ExchangeInvestigationAssetEvent:  Validation of the exchanged asset failed  ${assetDetails.serialNumberCustomer}`);
    }

}