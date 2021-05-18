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

import {Kafka, logLevel} from "kafkajs";
import Logger from '../logger/Logger';
import defaults from "../../defaults";
import SmartContractClient from "../../domains/SmartContractClient";
import GatewaySingleton from "../gateway/GatewaySingleton";
import {BadRequestError, DeploymentError, FabricError} from "../error/CustomErrors";
import {UniqueConstraintError} from 'sequelize'
import FailedIngestStats from "../../interfaces/FailedIngestStats";
import IngestStats from "../../interfaces/IngestStats";

/**
 * Class that instantiates a kafka consumer to ingest assets to the Fabric system by picking up the assets from the
 * according kafka topics. The kafka topics are filled by the DIS. Stats about successful or failed ingests are sent back
 * to a kafka topic for further evaluation
 * @class
 */
export default class KafkaConsumer {
    private kafka: Kafka;
    private consumer: any;
    private producer: any;
    private readonly logger: any


    constructor() {

        this.logger = (log: any) => {
            return ({namespace, level, label, log}: any) => {
                const {message, ...extra} = log;
                switch (level) {
                    case logLevel.INFO:
                        Logger.info(`[KAFKA] ${message}`);
                        break;
                    case logLevel.DEBUG:
                        Logger.debug(`[KAFKA] ${message}`);
                        break;
                    case logLevel.ERROR:
                        Logger.error(`[KAFKA] ${message}`);
                        break;
                    case logLevel.WARN:
                        Logger.warn(`[KAFKA] ${message}`);
                        break;
                    default:
                        Logger.info(`[KAFKA] ${message}`);
                }

            }
        }

        this.kafka = new Kafka({
            logLevel: logLevel.INFO,
            logCreator: this.logger,
            brokers: [`${defaults.kafka.host}:${defaults.kafka.port}`],
            clientId: 'AEMS-client',
        });
        this.consumer = this.kafka.consumer({groupId: defaults.kafka.groupId});
        this.producer = this.kafka.producer();


    }

    async consume() {
        const client = new SmartContractClient();
        await this.consumer.connect();
        await this.producer.connect();

        // Get all relevant mspIDs from identities and subscribe to their topics  assets.[realm name in lower case].topic
        const gatewaySingleton: GatewaySingleton = await GatewaySingleton.getInstance();
        const hlfIdentities = gatewaySingleton.getHLFIdentities();
        const admin = this.kafka.admin();
        // remember to connect and disconnect when you are done
        await admin.connect();
        const topics = await admin.listTopics();
        Logger.info(`[KAFKA] Already existing topics: ${topics.toString()}`);

        for (let identity of Object.keys(hlfIdentities)) {
            const mspID: string = hlfIdentities[identity]["HLF_IDENTITY_MSP_ID"];
            if (!topics.includes(mspID)) {
                // await admin.createTopics({ topics: [{topic: mspID}] }) // We don`t to create topics in aems
                // Logger.info(`[KAFKA] Created topic ${mspID} since it did not exist yet`);
                Logger.error(`[KAFKA] Topic ${mspID} does not exist!`);
            } else {
                Logger.info(`[KAFKA] Subscribing to topic ${mspID}`);
                const topic = `${mspID}`;
                await this.consumer.subscribe({topic}); // In case of replay add , fromBeginning: true
                Logger.info(`[KAFKA] Most recent offset for topic ${topic} ${JSON.stringify(await admin.fetchTopicOffsets(topic))}`);
            }
        }
        await admin.disconnect();

        Logger.info(`[KAFKA] Group description: ${JSON.stringify(await this.consumer.describeGroup())}`);

        this.consumer.run({
            eachMessage: async ({topic, partition, message}: any) => {
                const prefix = `${topic}[${partition} | ${message.offset}] / ${message.timestamp}`
                const asset: any = JSON.parse(message.value.toString());
                Logger.debug(`[KAFKA] - ${prefix} ${message.key}#${JSON.stringify(asset)}`);
                try {
                    const response = await client.upsertAsset(asset, topic);
                    switch (true) {
                        case (response.status >= 200 && response.status < 300):
                            Logger.info(`[KAFKA] [${topic}] Successfully stored asset ${asset.serialNumberCustomer} from topic ${topic}`);
                            const ingestStatsMessage: IngestStats = {
                                mspId: topic,
                                requestDate: asset.requestDate,
                                requestProcessId: asset.requestProcessId,
                                serialNumberCustomer: asset.serialNumberCustomer,
                                ingestDate: String(new Date().getTime())
                            };
                            this.producer
                                .send({
                                    topic: defaults.kafka.ingestStatsTopicName,
                                    messages: [
                                        {value: JSON.stringify(ingestStatsMessage)}
                                    ],
                                })
                                .then((r: any) => Logger.debug(`[KAFKA] Send message ${JSON.stringify(ingestStatsMessage)} successfully to ingest stats topic: ${JSON.stringify(r)}`))
                                .catch((e: { message: any; }) => Logger.error(`[KAFKA] Problem when sending asset to ingest stats topic: ${JSON.stringify(e)}`));
                            break;
                        case (response.status >= 400 && response.status < 500):
                            // In this case there was something wrong with the assets, therefore we do not retry it
                            throw new BadRequestError(`[KAFKA] [${topic}] Problem when calling storeAsset ${JSON.stringify(response)}`);
                        default:
                            // Something is wrong with the environment, we will retry later
                            throw new FabricError(`[KAFKA] [${topic}] Problem when calling storeAsset ${JSON.stringify(response)}`);


                    }

                } catch (e) {
                    switch (e.constructor) {
                        case UniqueConstraintError:
                        case BadRequestError:
                            Logger.error(`[KAFKA] [${topic}] Problem when calling storeAsset ${JSON.stringify(e)} with ${JSON.stringify(asset)}`);
                            // In this we do not retry the store the asset since the failure was caused by a missconfigured message
                            // Send error message to Dead Letter Queue
                            const failedIngestStatsMessage: FailedIngestStats = {
                                mspId: topic,
                                sourceService: 'AEMS',
                                jsonRequestAsset: asset,
                                requestDate: asset.requestDate,
                                requestProcessId: asset.requestProcessId,
                                warnings: [],
                                failReasons: [e.message]
                            };
                            this.producer
                                .send({
                                    topic: defaults.kafka.failedIngestStatsTopicName,
                                    messages: [
                                        {value: JSON.stringify(failedIngestStatsMessage)}
                                    ],
                                })
                                .then((r: any) => Logger.info(`[KAFKA] Send message ${JSON.stringify(failedIngestStatsMessage)} successfully to failed ingest topic: ${JSON.stringify(r)}`))
                                .catch((e: { message: any; }) => Logger.error(`[KAFKA] Problem when sending asset to failed ingest topic: ${JSON.stringify(e)}`));
                            break;
                        case DeploymentError:
                        case FabricError:
                        default:
                            // The default should be to retry the storeAsset
                            Logger.error(`[KAFKA] [${topic}] Problem when calling storeAsset ${JSON.stringify(e)} with ${JSON.stringify(asset)}.` +
                                `Problem with asset was not due to the properties of the asset, therefore we will retry to store this asset.`);
                            throw e
                    }
                }

            },
        })


        //const errorTypes = ['unhandledRejection', 'uncaughtException'];
        const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

        /*        errorTypes.map(type => { //TODO Think about this
                    process.on(type, async e => {
                        try {
                            Logger.info(`process.on ${type}`);
                            Logger.error(e);
                            await this.consumer.disconnect();
                            await this.producer.disconnect();
                            process.exit(0);
                        } catch (_) {
                            process.exit(1);
                        }
                    })
                });*/

        signalTraps.map(type => {
            // @ts-ignore
            process.once(type, async () => {
                try {
                    Logger.info(`[KAFKA] Disconnecting Consumer and Producer`);
                    await this.consumer.disconnect();
                    await this.producer.disconnect();
                } finally {
                    process.kill(process.pid, type);
                }
            })
        });


    }


}