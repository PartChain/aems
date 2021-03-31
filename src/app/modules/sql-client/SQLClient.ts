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

import {QueryTypes, Sequelize} from 'sequelize';
import Strings from "../mapper/Strings";
import ConnectionPoolSingleton from "../sql-connection-pool/ConnectionPoolSingleton";

/**
 * @class PostgresClient
 */
export default class PostgresClient {


    /**
     * @type any
     */
    options: any;

    /**
     * @param options
     */
    constructor(options: object = {}) {
        this.options = options;
    }


    /**
     *
     * @param model
     * @param sequelizeInstance
     */
    async initModel(model: any, sequelizeInstance: Sequelize) {
        return model(sequelizeInstance, Sequelize);
    }

    /**
     * Establishes a new connection pool to the database if the pool does not yet exist. Also creates a new database
     * and the according tables if they do not exist (based on the JWT mspID)
     * @param mspID
     */
    async connectAndSync(mspID: string) {

        // Postgres does not like hyphens a lot, therefore we stick to snake case
        mspID = Strings.kebabCaseToSnakeCase(mspID); //TODO Should we maybe convert the mspID to lower case?

        const ConnectionPoolInstance: ConnectionPoolSingleton = await ConnectionPoolSingleton.getInstance();
        return ConnectionPoolInstance.getConnectionPool(mspID);
    }

    createRawQueryOptionsWithReplacement(replacements: any) {
        return {
            // A function (or false) for logging your queries
            // Will get called for every SQL query that gets sent
            // to the server.
            // logging: Logger.debug, // this is also already in PostgresClient constructor

            // If plain is true, then sequelize will only return the first
            // record of the result set. In case of false it will return all records.
            plain: false,

            // Set this to true if you don't have a model definition for your query.
            raw: true,

            replacements: replacements,

            // The type of query you are executing. The query type affects how results are formatted before they are passed back.
            type: QueryTypes.SELECT
        };
    }

}