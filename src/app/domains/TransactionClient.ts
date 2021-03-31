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

import TransactionModel from '../models/Transaction';
import SQLClient from '../modules/sql-client/SQLClient';
import Objects from '../modules/mapper/Objects';
import Strings from '../modules/mapper/Strings';
import {Sequelize, Transaction} from "sequelize";
import SmartContractClient from "./SmartContractClient";
import Logger from "../modules/logger/Logger";

;

/**
 * Transaction SQL client
 * @class TransactionClient
 * @extends SQLClient
 */
export default class TransactionClient extends SQLClient {

    /**
     * Establishes a new connection pool to the database if the pool does not yet exist. Also creates a new database
     * and the according tables if they do not exist (based on the JWT mspID)
     * @param mspID
     */
    async connectAndSync(mspID: string): Promise<{ pool: Sequelize; transactionModel: any }> {

        const connectionPool = await super.connectAndSync(mspID);
        const transactionModel = await this.initModel(TransactionModel, connectionPool);
        await transactionModel.sync();
        return {pool: connectionPool, transactionModel: transactionModel};
    }


    /**
     * Get all transactions
     * @async
     * @param filter
     * @param userID
     * @param mspID
     */
    async getTransactions(filter: any = {}, userID: string, mspID: string) {

        const connectionPool = await this.connectAndSync(mspID);

        //Deactivate user_id filter
        //filter.user_id = userID;
        return await connectionPool.transactionModel.findAll({
            where: filter
        });
    }

    /**
     * Get all transactions for a specific asset
     * @async
     * @param serialNumberCustomer
     * @param propertyName
     * @param mspID
     */
    async getAssetTransactionHistory(serialNumberCustomer: string, propertyName: string = null, mspID: string) {

        const connectionPool = await this.connectAndSync(mspID);

        const filter = propertyName ? {
            serial_number_customer: serialNumberCustomer,
            property_name: propertyName,
            status: 'STORED'
        } : {serial_number_customer: serialNumberCustomer, status: 'STORED'};

        return await connectionPool.transactionModel.findAll({
            where: filter
        });
    }

    /**
     * Create transaction
     * @async
     * @param tx
     * @param mspID
     */
    async createTransaction(tx: any, mspID: string) {
        Logger.info(`Called createTransaction with ${JSON.stringify(tx)}`);

        const connectionPool = await this.connectAndSync(mspID);
        return await connectionPool.transactionModel.create(
            Objects.mapKeys(tx, Strings.camelCaseToSnakeCase)
        );
    }

    /**
     * Commit transaction
     * @async
     * @param ids
     * @param mspIDFromJWT
     */
    async commitTransaction(ids: Array<number>, mspIDFromJWT: string) {
        Logger.info(`Called commitTransaction with ids "${ids.toString()}"`);

        const connectionPool = await this.connectAndSync(mspIDFromJWT);
        const smartContract = new SmartContractClient();

        return {
            affectedTransactions: await connectionPool.pool.transaction(
                async (transaction: Transaction) => {

                    for (const id of ids) {
                        const tx = await connectionPool.transactionModel.findOne({
                            where: {
                                transaction_id: id,
                                status: 'PENDING'
                            }
                        });
                        Logger.debug(`Found transaction: "${JSON.stringify(tx)}"`);
                        const asset = await smartContract.getAssetDetail(tx.serial_number_customer, mspIDFromJWT);
                        Logger.debug(`Found asset: "${JSON.stringify(asset.data)}"`);

                        const result = (
                            asset.hasOwnProperty('data')
                            && asset.data.hasOwnProperty(tx.property_name)
                            && asset.data[tx.property_name] === tx.property_old_value
                        ) ? 'COMMITED' : 'REJECTED';
                        Logger.debug(`Result: "${result}"`);

                        await connectionPool.transactionModel.update(
                            {status: result, timestamp_changed: new Date().getTime()},
                            {where: {transaction_id: id}, transaction}
                        ).then(
                            async (res: any) => {
                                Logger.debug(`Update to Commited/Rejected: DONE`);

                                if (result === 'COMMITED') {
                                    asset.data[tx.property_name] = tx.property_new_value;
                                    Logger.debug(`Updated asset: "${JSON.stringify(asset.data)}"`);

                                    const update = await smartContract.updateAsset(asset.data, mspIDFromJWT);
                                    Logger.debug(`Ledger update request: "${JSON.stringify(update)}"`);

                                    if (update.status === 200) {
                                        const db = await connectionPool.transactionModel.update(
                                            {status: 'STORED', timestamp_changed: new Date().getTime()},
                                            {where: {transaction_id: id}, transaction}
                                        ).then(
                                            (res: any) => {
                                                Logger.debug(`Update to Stored: DONE "${res}"`);
                                                return res;
                                            }
                                        ).catch(
                                            (error: any) => {
                                                throw error;
                                            }
                                        );
                                    } else if (update.status === 400) {
                                        const db = await connectionPool.transactionModel.update(
                                            {status: 'REJECTED', timestamp_changed: new Date().getTime()},
                                            {where: {transaction_id: id}, transaction}
                                        ).then(
                                            (res: any) => {
                                                Logger.debug(`Update to Rejected: DONE "${res}"`);
                                                return res;
                                            }
                                        ).catch(
                                            (error: any) => {
                                                throw error;
                                            }
                                        );
                                    } else {
                                        throw new Error('Something went wrong');
                                    }
                                } else {
                                    Logger.debug(`Update to Rejected: DONE "${res}"`);
                                    return res;
                                }
                            }
                        ).catch(
                            (error: any) => {
                                Logger.debug(`Update to Commited/Rejected: FAILED "${error}"`);
                                throw error;
                            }
                        );
                    }
                }
            )
        };
    }

    /**
     * Delete transaction
     * @async
     * @param ids
     * @param userID
     * @param mspID
     */
    async deleteTransaction(ids: Array<number>, userID: string, mspID: string) {

        const connectionPool = await this.connectAndSync(mspID);
        return {
            affectedTransactions: await connectionPool.transactionModel.update(
                {status: 'CANCELED', timestamp_changed: new Date().getTime()},
                {where: {transaction_id: ids, status: 'PENDING'}}
            )
        };
    }
}
