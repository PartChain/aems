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

import App from './app/App';
import Logger from './app/modules/logger/Logger';
import * as cluster from 'cluster';
import * as os from 'os';

import Listener from './app/listeners/contractListener';
import Scheduler from './app/scheduler/requestAssetScheduler'
import InvestigationScheduler from './app/scheduler/requestAssetForInvestigation'
import SmartContractAPI from "./app/routes/SmartContractAPI";
import TransactionAPI from "./app/routes/TransactionAPI";
import AccessMgmtAPI from "./app/routes/AccessMgmtAPI";
import AccessMgmtClient from "./app/domains/AccessMgmtClient";
import KafkaConsumer from "./app/modules/kafka/kafkaConsumer";
import defaults from "./app/defaults";
import InvestigationAPI from "./app/routes/InvestigationAPI";


/**
 * Create an app instance and register routes. The Cluster package is used to run the AEMS on all CPU cores of the
 * machine where the Code is deployed. All instances listen to the same port, allowing the AEMS to handle multiple
 * requests simultaneously.
 */


const numCPUs = os.cpus().length;

if (cluster.isMaster) {

    Logger.info(
        "                                                 \n" +
        "                     _    _____ __  __ ____      \n" +
        "                    / \\  | ____|  \\/  / ___|   \n" +
        "                   / _ \\ |  _| | |\\/| \\___ \\ \n" +
        "                  / ___ \\| |___| |  | |___) |   \n" +
        "                 /_/   \\_\\_____|_|  |_|____/   \n" +
        "                                                 \n" +
        "                   © The PartChain Authors       \n");

    Logger.debug(`Master ${process.pid} is running`);
    Logger.debug(`Number of CPUS = ${numCPUs}`);

    Logger.info(`Starting to enroll all orgs if necessary`);
    const client = new AccessMgmtClient();
    client.enrollAllOrgs().catch(
        (error: any) => {
            Logger.error(`Error in enrolling all orgs ${error}`);
            throw new Error(`Error in enrolling all orgs ${error}`);
        }
    ).finally(() => {
            if (defaults.eventListener.enabled) {
                Logger.info(`Starting the contract listeners`);
                Listener().catch(
                    (error: any) => {
                        Logger.error(`Error in setting up the Listener ${error}`);
                        throw new Error(`Error in setting up the Listener ${error}`);
                    }
                );
            }
        }
    );

    if (defaults.cronjob.enabled) {
        Logger.info(`Starting the Asset Exchange Scheduler`);
        Scheduler().catch(
            (error: any) => {
                Logger.error(`Error in setting up the Scheduler ${error}`);
                throw new Error(`Error in setting up the Scheduler ${error}`);
            }
        );
        Logger.info(`Starting the Investigation Scheduler`);
        InvestigationScheduler().catch(
            (error: any) => {
                Logger.error(`Error in setting up the Investigation Scheduler ${error}`);
                throw new Error(`Error in setting up the Investigation Scheduler ${error}`);
            }
        );
    }

    if (defaults.kafka.enabled) {
        Logger.info(`[KAFKA] Kafka is enabled!`);
        const kafkaConsumer = new KafkaConsumer();
        kafkaConsumer.consume()
    }


    // Fork workers.
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker: any, code: any, signal: any) => {
        Logger.info(`Worker ${worker.process.pid} died`);
        //TODO: Evaluate in the future if we want to start a new worker if an old worker died
    });
} else {
    // Workers can share any TCP connection
    // In this case it is an Express server
    new App({
        routes: [
            SmartContractAPI,
            TransactionAPI,
            AccessMgmtAPI,
            InvestigationAPI
        ],
        swagger: {
            host: defaults.host,
            apis: [
                './src/app/actions/swagger.def',
                './src/app/actions/smart-contract/*',
                './src/app/actions/transaction/*',
                './src/app/actions/access-mgmt/*',
                './src/app/actions/investigation/*',
            ]
        }
    });

    Logger.debug(`Worker ${process.pid} started`);
}
