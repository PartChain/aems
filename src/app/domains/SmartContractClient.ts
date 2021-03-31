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

import * as customErrors from '../modules/error/CustomErrors'
import Gateway from '../modules/gateway/Gateway';
import Logger from '../modules/logger/Logger';
import Payload from './../modules/payload/Payload';
import Iterable from "../modules/iterable/Iterable";
import Response from "../modules/response/Response";
import defaults from '../defaults';
import OffChainDBClient from "./OffChainDBClient";
import requestEventHandler from '../handlers/events/requestEvent'
import exchangeAssetEventHandler from '../handlers/events/exchangeEvent'
import requestAssetForInvestigationHandler from '../handlers/events/requestAssetForInvestigation'
import exchangeAssetForInvestigationHandler from '../handlers/events/exchangeAssetForInvestigation'
import {RelationshipStatusType} from "../enums/RelationshipStatusType";
import GatewaySingleton from "../modules/gateway/GatewaySingleton";
import validateAssetList, {AssetList, Asset} from "../modules/asset-validator/AssetValidator";
import _ = require("lodash");


/**
 * Smart contract client class
 * @class SmartContractClient
 * @extends Gateway
 * @export SmartContractClient
 */
export default class SmartContractClient extends Gateway {

    /**
     * Process transaction to multiple channels
     * @async
     * @param tx
     * @param mspIDFromJWT
     * @param payload
     * @param type
     * @param pagination
     */
    async processTransaction(tx: string, mspIDFromJWT: string, payload: any[], type: string = 'eval', pagination: number = 0) {
        const gatewaySingleton: GatewaySingleton = await GatewaySingleton.getInstance();
        const chaincodeName = gatewaySingleton.getHLFIdentities()[defaults.hlfDefaultMspID]["HLF_NETWORK_CHAINCODE_ID"];
        await this.connectToMultipleChannels(
            mspIDFromJWT,
            [defaults.channelName],
            chaincodeName
        );
        return await this.connectionsWalk(
            this.connections[mspIDFromJWT], tx, mspIDFromJWT, payload, type, pagination
        );
    }

    /**
     * get smart contract connection without using JWT token
     * @async
     * @param channelName
     * @param chaincodeName
     */
    async getContractConnection(channelName: string[] = ["wolf-channel"], chaincodeName: string = "partchainccw") {
        Logger.info("Inside getContractConnection");
        const mspID = defaults.hlfDefaultMspID;
        await this.connectToMultipleChannels(
            mspID,
            channelName,
            chaincodeName
        );
        return await this.createContractListeners(this.connections[mspID]);
    }

    /**
     * Create smartContract listeners for all the connections
     * @async
     * @param connections
     */
    async createContractListeners(connections: any): Promise<any> {
        try {
            const listener = async (event: any) => {
                Logger.debug(`New Event: ${JSON.stringify(event)}`);
                if (event.eventName === 'RequestEvent') {
                    const requestEventDetails = event.payload.toString();
                    Logger.info(`New Event RequestEvent:  ${requestEventDetails}`);
                    await requestEventHandler(requestEventDetails);
                }
                // Handling exchangeAssetEvent 
                else if (event.eventName === 'ExchangeEvent') {
                    const exchangeEventDetails = event.payload.toString();
                    Logger.info(`New Event ExchangeEvent:  ${exchangeEventDetails}`);
                    await exchangeAssetEventHandler(exchangeEventDetails);
                }
                // Handling request Asset For Investigation 
                else if (event.eventName === 'RequestInvestigationEvent') {
                    const requestInvestigationEventDetails = event.payload.toString();
                    Logger.info(`New Event request Asset Investigation:  ${requestInvestigationEventDetails}`);
                    await requestAssetForInvestigationHandler(requestInvestigationEventDetails, defaults.hlfDefaultMspID);
                }

                // Handling exchange Asset For Investigation
                else if (event.eventName === 'ExchangeInvestigationEvent') {
                    const exchangeInvestigationEventDetails = event.payload.toString();
                    Logger.info(`New Event exchange Asset Investigation:  ${exchangeInvestigationEventDetails}`);
                    await exchangeAssetForInvestigationHandler(exchangeInvestigationEventDetails);
                } else {
                    Logger.warn(`No eventHandler for this Event!`);
                }
            };

            Logger.info(`Created successfully `)
            // Logger.info(`Setting up the file path `)
            const options = {
                startBlock: 1 //TODO call offChainDBClient.getLastBlock(defaults.hlfDefaultMspID) once we implement event replay
            };
            connections.map(async (connection: any) => {
                Logger.info(`Add contract Listener`);
                connection.contract.addContractListener(listener);
            });
            Logger.info(`createContractListeners done`);
            return true;

        } catch (error) {
            //TODO test this! This should restart the listener if it crashes
            Logger.error(`Error occurred in contract listener = ${error}`);
            new Promise<void>(resolve => setTimeout(() => resolve(), 10000)).then(() => this.createContractListeners(connections));
            //return this.createContractListeners(connections)
            //throw new customErrors.FabricError(`Error occurred in contract listener = ${error}`)

        }
    }

    /**
     * Walk thru assigned connections
     * @async
     * @param connections
     * @param tx
     * @param mspIDFromJWT
     * @param payload
     * @param type
     * @param pagination
     */
    async connectionsWalk(connections: any, tx: string, mspIDFromJWT: string, payload: any[], type: string, pagination: number) {
        let acc: any[];

        const promisesConnections = connections.map(async (connection: any) => {
            Logger.info(`[${mspIDFromJWT}] Executing transaction ${tx} for mspID ${mspIDFromJWT} and channel "${connection.channelName}" with payload: "${JSON.stringify(payload)}"`);
            let connectionAcc: any = [];
            for (let key in payload) {

                Logger.debug(`[${mspIDFromJWT}]Execution of transaction ${tx} on channel "${connection.channelName}" started`);
                Logger.debug(`[${mspIDFromJWT}]Payload in connection walk =  "${JSON.stringify(payload[key])}"`);

                const buffer = await SmartContractClient.executeTransaction(
                    connection.channel, connection.contract, tx, mspIDFromJWT, payload[key], type
                );
                Logger.debug(`[${mspIDFromJWT}] Execution of transaction ${tx} finished`);
                Logger.debug(`[${mspIDFromJWT}] Invoking function "${tx}" with args "${JSON.stringify(key)}"`);
                Logger.debug(`[${mspIDFromJWT}] Response of transaction ${tx} is: ${buffer.toString()}`);

                if (buffer) {
                    Logger.debug(`"[${mspIDFromJWT}] Finalization of collections started`);
                    let collection = Payload.toJSON(buffer);
                    Logger.debug(`[${mspIDFromJWT}] Final collection with nested levels: ${JSON.stringify(collection)}`);
                    Logger.debug(`[${mspIDFromJWT}] Finalization of collections finished`);
                    connectionAcc.push(collection);

                }
            }

            Logger.debug(`[${mspIDFromJWT}] Executing done`);
            return connectionAcc;
        });

        acc = await Promise.all(promisesConnections);
        Logger.debug(`[${mspIDFromJWT}]ConnectionsWalk done`);
        return [].concat(...acc);

    }

    /**
     * Execute transaction
     * @static
     * @async
     * @param channel
     * @param contract
     * @param tx
     * @param mspIDFromJWT
     * @param payload
     * @param type
     */
    static async executeTransaction(channel: any, contract: any, tx: string, mspIDFromJWT: string, payload: any, type: string) {

        if (type === 'submit') {
            let mspID = null;
            switch (tx) {
                case "requestAsset":
                    Logger.debug(`[${mspIDFromJWT}] processTransaction: Inside request Asset `);
                    mspID = payload.manufacturerMSPID;
                    break;
                case "createAsset":
                case "updateAsset":
                case "isAssetCurrent":
                case "updateRequest":
                case "enrollOrg":
                case "createRequest":
                case "createInvestigation":
                case "updateOrgInvestigationStatus":
                case "addSerialNumberCustomer":
                case "decryptDataForInvestigation":
                case "requestAssetForInvestigation":
                    Logger.debug(`[${mspIDFromJWT}] processTransaction: Inside store/update Asset/isAssetCurrent `);
                    mspID = mspIDFromJWT;
                    break;
                case "exchangeAssetInfo":
                    Logger.debug(`[${mspIDFromJWT}] processTransaction: Inside exchangeAssetInfo Asset `);
                    mspID = payload.parentMSP;
                    break;
                case "addOrganisationToInvestigation":
                case "shareInvestigationKey":
                case "exchangeAssetForInvestigation":
                    Logger.debug(`[${mspIDFromJWT}] processTransaction: Inside addOrganisationToInvestigation Asset `);
                    mspID = payload.targetOrg;
                    break;
                default:
                    Logger.warn(`[${mspIDFromJWT}] processTransaction: Invalid function call `);
                    mspID = null;
                    break;
            }

            if (mspID != null) {
                Logger.debug(`[${mspIDFromJWT}] executeTransaction MspID = ${mspID}`);
                const endorsingPeer = await channel.getEndorsers(mspID);
                Logger.debug(`[${mspIDFromJWT}] Endorsing peer for ${mspID} =  ${JSON.stringify(endorsingPeer)}`);
                Logger.debug(`[${mspIDFromJWT}] ExecuteTransaction tx = ${tx}, type = ${type},  Payload  = ${JSON.stringify(payload)},  mspID =  ${mspID}`);
                const privatePayload = Buffer.from(JSON.stringify(payload));
                // submit transaction to blockchain
                const result = await contract.createTransaction(tx)
                    .setTransient({"privatePayload": privatePayload})
                    .setEndorsingPeers(endorsingPeer)
                    .submit(tx, Payload.removeExtraComma(JSON.stringify(payload)));
                Logger.debug(`[${mspIDFromJWT}] result of create transaction = ${JSON.stringify(result)}`);
                return result;

            } else {
                Logger.info(`[${mspIDFromJWT}] executeTransaction MspID = ${mspID}`);
                return {
                    status: 500,
                    message: " processTransaction:  invalid function call"
                };
            }

        } else if (type === 'eval') {
            Logger.debug(`[${mspIDFromJWT}] Inside evaluate function`);
            Logger.debug(`[${mspIDFromJWT}] tx = ${tx}, type = ${type}, Payload type = ${typeof (payload)},  Payload  = ${payload}`);
            return await contract.evaluateTransaction(
                tx, tx, Payload.removeExtraComma(JSON.stringify(payload))
            );
        }

        return null;
    }

    async upsertAsset(asset: AssetList, mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] Called upsertAsset with ${JSON.stringify(asset)}`);
        const offChainDBClient = new OffChainDBClient();

        asset = validateAssetList(asset);

        let assetsToStore: any = [];
        let assetsToUpdate: any = [];

        let responseNothingToUpdate: any = [];


        await Promise.all(asset.map(async (singleAsset: Asset): Promise<any> => {
            let alreadyStoredCheck: any = await this.getAssetDetail(singleAsset.serialNumberCustomer, mspIDFromJWT);
            if (alreadyStoredCheck.status === 200) {
                // If the asset already stored and the asset in the request is the same we do not need to store anything
                singleAsset["mspID"] = alreadyStoredCheck.data.mspID;
                // Merge both child component arrays
                singleAsset.componentsSerialNumbers = [...new Set([...singleAsset.componentsSerialNumbers, ...alreadyStoredCheck.data.componentsSerialNumbers])];

                Logger.debug(`[${mspIDFromJWT}] singleAsset before IsAsset Current Check ${JSON.stringify(singleAsset)}`);
                const nothingToUpdateCheck = await this.isAssetCurrent(_.pick(singleAsset, _.keys(alreadyStoredCheck.data)) as Asset, mspIDFromJWT);
                Logger.info(`[${mspIDFromJWT}] Result of isAssetCurrent: ${JSON.stringify(nothingToUpdateCheck)}`);
                if (nothingToUpdateCheck.hasOwnProperty("data") && nothingToUpdateCheck["data"].hasOwnProperty("isCurrent") && nothingToUpdateCheck.data.isCurrent) {
                    Logger.info(`[${mspIDFromJWT}] Asset ${singleAsset.serialNumberCustomer} already exists in Ledger, but there is nothing to update`);
                    responseNothingToUpdate.push(singleAsset);
                } else {
                    Logger.info(`[${mspIDFromJWT}] Asset ${singleAsset.serialNumberCustomer} already exists in Ledger, therefore we will update it`);
                    assetsToUpdate.push(singleAsset);
                }
                // If asset is not in postgres but is in fabric we try to store it in the postgres
                const notInPostgresCheck = await offChainDBClient.getAssetDetail(singleAsset.serialNumberCustomer, 0, mspIDFromJWT);
                if (!(Object.keys(notInPostgresCheck).length > 0 || Array.isArray(notInPostgresCheck) && notInPostgresCheck.length > 0)) {
                    await offChainDBClient.storeAssets(Iterable.create(singleAsset), mspIDFromJWT, mspIDFromJWT);
                }
            } else {
                Logger.info(`[${mspIDFromJWT}] Asset ${singleAsset.serialNumberCustomer} is not in Ledger, therefore we will store it`);
                assetsToStore.push(singleAsset);
            }

            return singleAsset
        }));

        let [responseUpdate, responseStore] = await Promise.all([this.updateAsset(assetsToUpdate, mspIDFromJWT), this.storeAsset(assetsToStore, mspIDFromJWT)]);
        const returnObject: any = {
            "status": responseStore.status == 200 && responseUpdate.status == 200 ? 200 : responseUpdate.status == 200 ? responseUpdate.status : responseStore.status,
            "data": [...Iterable.create(responseUpdate.data ? responseUpdate.data : []), ...Iterable.create(responseStore.data ? responseStore.data : []), ...responseNothingToUpdate],
            "resultLength": responseStore.resultLength + responseUpdate.resultLength + responseNothingToUpdate.length,
            "assetsStored": responseStore.resultLength,
            "assetsUpdated": responseUpdate.resultLength
        };
        if (responseUpdate.hasOwnProperty("error") || responseStore.hasOwnProperty("error")) {
            returnObject["error"] = [...(responseUpdate.hasOwnProperty("error") ? responseUpdate.error : []), ...(responseStore.hasOwnProperty("error") ? responseStore.error : [])];
        }
        return returnObject

    }


    /**
     * Store asset Smart Contract
     * @async
     * @param asset
     * @param mspIDFromJWT
     */
    async storeAsset(asset: AssetList, mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] Called storeAsset with ${JSON.stringify(asset)}`);

        asset = validateAssetList(asset);

        await this.childrenAvailabilityCheck(asset, mspIDFromJWT);

        Logger.debug(`[${mspIDFromJWT}] Ready for transaction in storeAsset`);
        let response = await Response.processResponse(
            await this.processTransaction('createAsset', mspIDFromJWT, Iterable.create(asset), 'submit'),
            true,
            mspIDFromJWT,
            true
        );

        if (response.status === 200) {
            const offChainDBClient = new OffChainDBClient();
            await offChainDBClient.storeAssets(Iterable.create(asset), mspIDFromJWT, mspIDFromJWT);

        } else {
            Logger.error(`[${mspIDFromJWT}] Problem when calling storeAssets: ${JSON.stringify(response)}`);
        }

        return response;

    }


    /**
     * Request asset from Smart Contract
     * @async
     * @param asset
     * @param mspIDFromJWT
     */
    async requestAsset(asset: any, mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] Called requestAsset with ${JSON.stringify(asset)}`);

        Logger.debug(`[${mspIDFromJWT}] Ready for transaction in requestAsset`);
        return await Response.processResponse(
            await this.processTransaction('requestAsset', mspIDFromJWT, Iterable.create(asset), 'submit'),
            true,
            mspIDFromJWT,
            true
        );

    }

    /**
     * Request asset for investigation from Smart Contract
     * @async
     * @param request
     * @param mspIDFromJWT
     */
    async requestAssetForInvestigation(request: any, mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] Called requestAsset with ${JSON.stringify(request)}`);

        Logger.debug(`[${mspIDFromJWT}] Ready for transaction in requestAssetForInvestigation`);
        return await Response.processResponse(
            await this.processTransaction('requestAssetForInvestigation', mspIDFromJWT, Iterable.create(request), 'submit'),
            true,
            mspIDFromJWT,
            true
        );

    }

    /**
     * Exchange asset Smart Contract
     * @async
     * @param targetMSP: to which private data collection to write to
     * @param serialNumberCustomer
     * @param assetInfo: The asset information of the asset to write
     * @param mspIDFromJWT
     */
    async exchangeAsset(targetMSP: string, serialNumberCustomer: string, assetInfo: string, mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] Called exchangeAsset`);

        let asset = {
            parentMSP: targetMSP,
            serialNumberCustomer: serialNumberCustomer,
            assetInfo: assetInfo
        };

        Logger.debug(`[${mspIDFromJWT}] Ready for transaction in exchangeAsset ${JSON.stringify(asset)}`);
        return await Response.processResponse(
            await this.processTransaction('exchangeAssetInfo', mspIDFromJWT, Iterable.create(asset), 'submit'),
            true,
            mspIDFromJWT,
            true
        );


    }


    /**
     * Is asset current Smart Contract. If the assets contains more keys then the assets on the ledger false will be returned!
     * @async
     * @param asset
     * @param mspIDFromJWT
     */
    async isAssetCurrent(asset: AssetList, mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] Called isAssetCurrent with ${JSON.stringify(asset)}`);

        Logger.debug(`[${mspIDFromJWT}] Ready for transaction in isAssetCurrent`);
        return await Response.processResponse(
            await this.processTransaction('isAssetCurrent', mspIDFromJWT, Iterable.create(asset), 'submit'),
            false,
            mspIDFromJWT
        );

    }

    /**
     * Update the qualityStatus of an asset of another mspID
     * @param assets
     * @param mspIDFromJWT
     */
    async flagForeignAssets(assets: AssetList, mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] Called flagForeignAssets with ${JSON.stringify(assets)}`);

        assets = validateAssetList(assets);

        const response = Object.create({});
        response["status"] = 200;
        response["data"] = [];

        const offChainDBClient = new OffChainDBClient();
        for (let singleAsset of assets) {
            if (singleAsset.qualityStatus.toLowerCase() !== "flag") {
                throw new customErrors.BadRequestError(`Asset ${JSON.stringify(singleAsset)} is not your asset, therefore you can only flag it!`)
            }
            await offChainDBClient.updateRelationshipStatus(mspIDFromJWT, singleAsset.serialNumberCustomer, RelationshipStatusType.updatePending);
            response["data"].push(`Initiated flagging process for Asset ${singleAsset.serialNumberCustomer} to ${singleAsset.manufacturer}`);
        };
        return response;

    }

    /**
     * Update asset Smart Contract
     * @async
     * @param assets
     * @param mspIDFromJWT
     * @param createTransactionRecord: true or false whether a transaction record should be created in the postgres tables,
     *                                  needed for asset that are not updated by the transactionClient (e.g. asset by other mspIDs)
     */
    async updateAsset(assets: AssetList, mspIDFromJWT: string, createTransactionRecord: boolean = false) {
        Logger.info(`[${mspIDFromJWT}] Called updateAsset with ${JSON.stringify(assets)}`);
        assets = validateAssetList(assets);
        const offChainDBClient = new OffChainDBClient();
        // We only can update the parts we own, for the other parts we can only update the qualityStatus
        const ownAssets: AssetList = [];
        const foreignAssets: AssetList = [];
        for (let singleAsset of assets) {
            const ownerCheck = await this.getAssetDetail(singleAsset.serialNumberCustomer, mspIDFromJWT);
            if (mspIDFromJWT == ownerCheck.data.mspID) {
                // Merge both child component arrays, since we do not allow the deletion of children right now
                singleAsset.componentsSerialNumbers = [...new Set([...singleAsset.componentsSerialNumbers, ...ownerCheck.data.componentsSerialNumbers])];
                ownAssets.push(singleAsset);
            } else {
                foreignAssets.push(singleAsset);
            }
        };
        const foreignAssetsResponse = await this.flagForeignAssets(foreignAssets, mspIDFromJWT);
        await this.childrenAvailabilityCheck(ownAssets, mspIDFromJWT);
        Logger.debug(`[${mspIDFromJWT}] Ready for transaction in updateAsset `);
        let response = await this.processTransaction('updateAsset', mspIDFromJWT, Iterable.create(ownAssets), 'submit');
        Logger.info(`[${mspIDFromJWT}] response of updateAsset: ${JSON.stringify(response)}`);

        // After successful update, we have to look up who we shared this asset with, since we need to also update the asset in their private data collection
        // check if response is success
        for (let ownSingleAsset of ownAssets) {
            // Get relationships of this asset where status is shared
            const relationships = await offChainDBClient.getRelationshipsByParentAndStatus(ownSingleAsset.serialNumberCustomer, [RelationshipStatusType.parentShared, RelationshipStatusType.childShared], mspIDFromJWT);
            // Write into the pdc of this mspIDs
            const childrenMspIDs = relationships.length > 0 ? _.compact([...new Set(relationships.map((rel: any) => rel.child_mspid))]) : [];
            const childRelationshipsForThisAsset: any = await offChainDBClient.getRelationshipsByParent(ownSingleAsset.serialNumberCustomer, mspIDFromJWT);
            // If this asset has a parent we also need to share it with the parent mspID
            const parentRelationshipsForThisAsset: any = await offChainDBClient.getAssetParent(ownSingleAsset.serialNumberCustomer, mspIDFromJWT);
            const parentMspIDs: Array<any> = parentRelationshipsForThisAsset.hasOwnProperty("parents") && parentRelationshipsForThisAsset.parents.length > 0 ? [...new Set(parentRelationshipsForThisAsset.parents.map((parent: any) => parent.mspid))] : [];
            const uniqueMspIDs = new Set([...childrenMspIDs, ...parentMspIDs]);
            const adjustedAsset = (await this.getAssetDetail(ownSingleAsset.serialNumberCustomer, mspIDFromJWT)).data;
            if (adjustedAsset.hasOwnProperty("serialNumberCustomerHash")) {
                delete adjustedAsset["serialNumberCustomerHash"];
            }
            if (adjustedAsset.hasOwnProperty("componentKey")) {
                delete adjustedAsset["componentKey"];
            }
            // clone of full details for sharing with other orgs in the investigation
            const assetDetailsForInvestigation = adjustedAsset;
            // check if the asset belongs to any investigation 
            const serialNumberCheckForInvestigation = await offChainDBClient.getRelationshipForSharedSNCInInvestigation(ownSingleAsset.serialNumberCustomer, mspIDFromJWT);
            Logger.info(`[${mspIDFromJWT}]  check if the asset belongs to any investigation = ${JSON.stringify(serialNumberCheckForInvestigation)}`);

            const investigationMSPs: string[] = serialNumberCheckForInvestigation.map((investigation: any) => {
                return investigation.shared_with_org
            });
            const investigationMSPSet = new Set(investigationMSPs);
            Logger.debug(`[${mspIDFromJWT}] update asset: investigationMSPs = ${JSON.stringify(investigationMSPs)}`);
            Logger.debug(`[${mspIDFromJWT}] update asset: investigationMSPSet = ${investigationMSPSet}`);
            // Seprate the MSP for exchange asset as part of Investigation
            let mspIDForNormalExchange = new Set([...uniqueMspIDs].filter(msp => !investigationMSPSet.has(msp)));
            Logger.info(`[${mspIDFromJWT}] update asset: mspIDForNormalExchange = ${JSON.stringify(mspIDForNormalExchange)} `);
            // share with children mspIDs
            for (let mspID of mspIDForNormalExchange) {
                // Only share this componentsSerialNumbers which belong to this mspID
                adjustedAsset.componentsSerialNumbers = childRelationshipsForThisAsset.filter((relationship: any) => relationship.child_mspid === mspID).map((relationship: any) => relationship.child_serial_number_customer);
                Logger.debug(`[${mspIDFromJWT}] exchange asset mspID ${mspID}`);
                Logger.debug(JSON.stringify(adjustedAsset));
                const exchangeAssetResponse = await this.exchangeAsset(
                    mspID,
                    adjustedAsset.serialNumberCustomer,
                    JSON.stringify(adjustedAsset),
                    mspIDFromJWT
                );
                Logger.debug(`[${mspIDFromJWT}] response of exchangeAsset =  ${JSON.stringify(exchangeAssetResponse)}`);
                if (exchangeAssetResponse.status !== 200) {
                    Logger.debug(`[${mspIDFromJWT}] exchange asset mspID ${mspID}`);
                    if (exchangeAssetResponse.status === 403) {
                        //TODO should this throw an error or not?
                        Logger.warn(`[${mspIDFromJWT}] Error when trying to exchange updated Asset with mspID ${mspID} since ACL is INACTIVE: ${JSON.stringify(exchangeAssetResponse)}`);
                    } else {
                        throw new Error(`Error when trying to exchange updated Asset with mspID ${mspID}: ${JSON.stringify(exchangeAssetResponse)}`);
                    }
                }
            }
            if (serialNumberCheckForInvestigation.length > 0) {
                Logger.info(`[${mspIDFromJWT}] share the update asset information with other orgs in the investigation`);
                serialNumberCheckForInvestigation.map(async (investigationAsset: any) => {
                    Logger.info(`[${mspIDFromJWT}] updateAsset:  investigation details = ${JSON.stringify(investigationAsset)}`);
                    const assetInfo = JSON.stringify(assetDetailsForInvestigation);
                    const exchangeRequest = {
                        investigationID: investigationAsset.investigation_id,
                        assetInfo,
                        targetOrg: investigationAsset.shared_with_org
                    }
                    Logger.info(`[${mspIDFromJWT}] updateAsset:  Exchange asset information for investigation = ${JSON.stringify(exchangeRequest)}`);
                    // 7. exchange asset information to the requesting org
                    const response = await this.processTransaction('exchangeAssetForInvestigation', mspIDFromJWT, [exchangeRequest], 'submit');
                    Logger.info(`[${mspIDFromJWT}] updateAsset:  exchangeAssetForInvestigation Response = ${JSON.stringify(response)}`);
                })
            }
            // New relationships would be created with this command and then triggered by the scheduler again
            await offChainDBClient.updateAsset(Iterable.create(ownSingleAsset), mspIDFromJWT, Object.create({}), createTransactionRecord);
        }
        // Returning the response for update asset
        return await Response.processResponse(
            [...Iterable.create(foreignAssetsResponse.data.length > 0 ? foreignAssetsResponse : []), ...Iterable.create(response.length > 0 ? response : [])],
            true,
            mspIDFromJWT,
            true
        );
    }

    /**
     * Get asset detail Smart Contract for Events
     * @async
     * @param serialNumberCustomer
     * @param mspIDFromJWT
     */
    async getAssetEventDetail(serialNumberCustomer: any, mspIDFromJWT: string) {
        Logger.debug(`[${mspIDFromJWT}] Called getAssetEventDetail with ${serialNumberCustomer}`);

        const filter = {serialNumberCustomer: serialNumberCustomer};

        Logger.debug(`[${mspIDFromJWT}] Ready for transaction in getAssetEventDetail`);
        return await Response.processResponse(
            await this.processTransaction('getAssetEventDetail', mspIDFromJWT, Iterable.create(filter), 'eval'),
            false,
            mspIDFromJWT
        );

    }

    /**
     * Get asset detail Smart Contract
     * @async
     * @param serialNumberCustomer
     * @param mspIDFromJWT
     */
    async getAssetDetail(serialNumberCustomer: any, mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] Called getAssetDetail with ${serialNumberCustomer}`);

        const filter = {serialNumberCustomer: serialNumberCustomer};

        Logger.debug(`[${mspIDFromJWT}] Ready for transaction in getAssetDetail`);
        return await Response.processResponse(
            await this.processTransaction('getAssetDetail', mspIDFromJWT, Iterable.create(filter), 'eval'),
            false,
            mspIDFromJWT
        );

    }

    /**
     * Get  public asset detail Smart Contract
     * @async
     * @param serialNumberCustomer
     * @param mspIDFromJWT
     */
    async getPublicAssetDetail(serialNumberCustomer: any, mspIDFromJWT: string) {
        Logger.debug(`[${mspIDFromJWT}] Called getPublicAssetDetail with ${serialNumberCustomer}`);

        const filter = {serialNumberCustomer: serialNumberCustomer};

        Logger.debug(`[${mspIDFromJWT}] Ready for transaction in getPublicAssetDetail`);
        return await Response.processResponse(
            await this.processTransaction('getPublicAssetDetail', mspIDFromJWT, Iterable.create(filter), 'eval'),
            false,
            mspIDFromJWT
        );

    }

    /**
     * validate the asset details to the hash stored in the ledger
     * @async
     * @param assetDetails
     * @param mspIDFromJWT
     */
    async validateAsset(assetDetails: any, mspIDFromJWT: string) {

        return await Response.processResponse(
            await this.processTransaction('validateAsset', mspIDFromJWT, Iterable.create(assetDetails), 'eval'),
            false,
            mspIDFromJWT
        );

    }

    /**
     * Get children serial numbers
     * @protected
     * @param collection
     */
    protected getChildrenSerialNumbers(collection: Array<any>): Array<string> {
        Logger.debug(`Called getChildrenSerialNumbers with "${JSON.stringify(collection)}"`);

        return (Array.isArray(collection) ? collection : [collection]).reduce(
            (acc: Array<string>, object) => {
                Logger.debug(`getChildrenSerialNumbers process record "${JSON.stringify(object)}"`);

                if (Array.isArray(object.componentsSerialNumbers)) {
                    object.componentsSerialNumbers.forEach(
                        (serialNumber: any) => acc.push(serialNumber)
                    );
                }
                return acc;
            }, []
        );
    }

    /**
     * Check availability of asset's children
     * @async
     * @protected
     * @param assets
     * @param mspIDFromJWT
     */
    protected async childrenAvailabilityCheck(assets: any, mspIDFromJWT: string) {

        for (let asset of (Iterable.create(assets))) {
            if (Array.isArray(asset.componentsSerialNumbers) && asset.componentsSerialNumbers.length > 0) {
                const offChainDBClient = new OffChainDBClient();
                const unavailableChildren = [];
                for (let childSerialNumberCustomer of asset.componentsSerialNumbers) {
                    if (!await offChainDBClient.isRelationshipAvailable(asset.serialNumberCustomer, childSerialNumberCustomer, mspIDFromJWT)) {
                        unavailableChildren.push(childSerialNumberCustomer);
                    }
                }
                if (unavailableChildren.length > 0) {
                    throw new customErrors.BadRequestError(`These children of asset ${asset.serialNumberCustomer} already have a different parent and are not of type BATCH: ${unavailableChildren.toString()}`)
                }

            }
        }
    }

}