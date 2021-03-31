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

import {QueryTypes, Sequelize} from "sequelize";
import Logger from "../logger/Logger";
import defaults from "../../defaults";

/**
 * Singleton Class which hold all ConnectionPools which are needed to communicate with the difference databases
 * https://medium.com/javascript-everyday/singleton-made-easy-with-typescript-6ad55a7ba7ff
 */
export default class ConnectionPoolSingleton {
    private static instance: ConnectionPoolSingleton;
    private readonly connectionPools: any;

    private constructor() {
        Logger.info("Creating ConnectionPoolSingleton now");
        this.connectionPools = Object.create({});
    }

    static async getInstance(): Promise<ConnectionPoolSingleton> {
        Logger.debug("In getInstance now");
        if (!ConnectionPoolSingleton.instance) {
            ConnectionPoolSingleton.instance = new ConnectionPoolSingleton();
            await ConnectionPoolSingleton.instance.setup();

        }
        return ConnectionPoolSingleton.instance;
    }

    /**
     * Sets up the initial connection to the default postgres databases with the name postgres. This connection is needed
     * to create the other databases
     */
    async setup() {
        Logger.info("In ConnectionPoolSingleton setup now");
        Logger.info(`Creating Connection to db ${defaults.postgres.name} on host ${defaults.postgres.host} with user ${defaults.postgres.user}`);
        this.connectionPools[defaults.postgres.name] = await new Sequelize(
            defaults.postgres.name,
            defaults.postgres.user,
            defaults.postgres.password,
            {
                host: defaults.postgres.host,
                // @ts-ignore
                dialect: 'postgres',
                dialectOptions: {
                    application_name: "AEMS"
                },
                logging: Logger.debug.bind(Logger),
                pool: {
                    max: 4, //TODO: Evaluate this number
                    min: 0,
                    acquire: 30000,
                    idle: 10000,
                    evict: 1000
                }
            },
        ).sync();
    }

    /**
     * Returns a ConnectionPool based on a mspID
     * @param mspID
     */
    async getConnectionPool(mspID: string) {
        Logger.debug("In getConnectionPool now");
        if (!this.connectionPools.hasOwnProperty(mspID)) {
            await this.createConnectionPool(mspID);
        }
        return this.connectionPools[mspID];
    }

    /**
     * Creates a ConnectionPool based on mspID
     * @param mspID
     */
    async createConnectionPool(mspID: string) {
        Logger.debug("In createConnectionPool now");

        // First we will check if the database with this mspID does exist
        let createString = `select datname from pg_database where datname = :mspID`;
        if (this.connectionPools[defaults.postgres.name] === undefined) {
            await this.setup();
        }
        const databaseQuery = await this.connectionPools[defaults.postgres.name].query(createString, {
            plain: false,
            // Set this to true if you don't have a model definition for your query.
            raw: true,
            replacements: {mspID: mspID},
            // The type of query you are executing. The query type affects how results are formatted before they are passed back.
            type: QueryTypes.SELECT
        });

        if (databaseQuery.length === 0) {
            Logger.info(`Database ${mspID} does not exist yet, but will be created now`);
            // TODO Replacements do not work here, but would be nice to avoid SQL injections
            createString = `CREATE DATABASE "${mspID}" with owner ${defaults.postgres.user}`;
            await this.connectionPools[defaults.postgres.name].query(createString, {
                plain: false,
                // Set this to true if you don't have a model definition for your query.
                raw: true,
                replacements: {
                    mspID: mspID,
                    owner: defaults.postgres.user
                },
                // The type of query you are executing. The query type affects how results are formatted before they are passed back.
                type: QueryTypes.SELECT
            });
        }

        Logger.debug(`Creating Connection to db ${mspID} on host ${defaults.postgres.host} with user ${defaults.postgres.user}`);
        this.connectionPools[mspID] = await new Sequelize(
            mspID,
            defaults.postgres.user,
            defaults.postgres.password,
            {
                host: defaults.postgres.host,
                // @ts-ignore
                dialect:  'postgres',
                dialectOptions: {
                    application_name: "AEMS"
                },
                logging: Logger.debug.bind(Logger),
                pool: {
                    max: 8, //TODO: Evaluate this number
                    min: 0,
                    acquire: 30000,
                    idle: 10000,
                    evict: 1000
                }
            },
        ).sync();
        Logger.info(`Created ConnectionPool to db ${mspID} on host ${defaults.postgres.host} with user ${defaults.postgres.user}`);

    }

}