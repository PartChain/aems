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


export default class KafkaConsumer {
    private kafka: Kafka;
    private consumer: any;
    private readonly logger: any


    constructor() {

        this.logger = (log: any) => {
            return ({ namespace, level, label, log }: any) => {
                const { message, ...extra } = log;
                switch (level){
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
        this.consumer = this.kafka.consumer({ groupId: defaults.kafka.groupId });


    }

    async consume(){
        const client = new SmartContractClient();
        await this.consumer.connect();

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
            if(!topics.includes(mspID)){
                // await admin.createTopics({ topics: [{topic: mspID}] }) // We don`t to create topics in aems
                // Logger.info(`[KAFKA] Created topic ${mspID} since it did not exist yet`);
                Logger.error(`[KAFKA] Topic ${mspID} does not exist!`);
            }
            else{
                Logger.info(`[KAFKA] Subscribing to topic ${mspID}`);
                const topic = `${mspID}`;
                await this.consumer.subscribe({topic}); // think about , fromBeginning: true
                Logger.info(`[KAFKA] Most recent offset for topic ${topic} ${JSON.stringify(await admin.fetchTopicOffsets(topic))}`);
            }
        }
        await admin.disconnect();

        Logger.info(`[KAFKA] Group description: ${JSON.stringify(await this.consumer.describeGroup())}`);

        this.consumer.run({
            eachMessage: async ({ topic, partition, message }: any) => {
                const prefix = `${topic}[${partition} | ${message.offset}] / ${message.timestamp}`
                const asset: any = JSON.parse(message.value.toString());
                Logger.debug(`[KAFKA] - ${prefix} ${message.key}#${JSON.stringify(asset)}`);
                try{
                    const response = await client.upsertAsset(asset, topic);
                    switch (true){
                        case (response.status >= 200 && response.status < 300):
                            Logger.info(`[KAFKA] [${topic}] Successfully stored asset ${asset.serialNumberCustomer} from topic ${topic}`);
                            break;
                        case (response.status >= 400 && response.status < 500):
                            // In this case there was something wrong with the assets, therefore we do not retry it
                            Logger.error(`[KAFKA] [${topic}] Problem when calling storeAsset ${JSON.stringify(response)} with ${JSON.stringify(asset)}`);
                            throw new BadRequestError(`[KAFKA] [${topic}] Problem when calling storeAsset ${JSON.stringify(response)}`);
                        default:
                            // Something is wrong with the environment, we will retry later
                            Logger.error(`[KAFKA] [${topic}] Problem when calling storeAsset ${JSON.stringify(response)} with ${JSON.stringify(asset)}`);
                            throw new FabricError(`[KAFKA] [${topic}] Problem when calling storeAsset ${JSON.stringify(response)}`);


                    }

                }
                catch (e) {
                    switch (e.constructor) {
                        case UniqueConstraintError:
                        case BadRequestError:
                            Logger.error(`[KAFKA] [${topic}] Problem when calling storeAsset ${JSON.stringify(e)} with ${JSON.stringify(asset)}`);
                            // In this we do not retry the store the asset since the failure was caused by a missconfigured message
                            break;
                        case DeploymentError:
                        case FabricError:
                        default:
                            // The default should be to retry the storeAsset
                            Logger.error(`[KAFKA] [${topic}] Problem when calling storeAsset ${JSON.stringify(e)} with ${JSON.stringify(asset)}.`+
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
                    Logger.info(`[KAFKA] Disconnecting Consumer`);
                    await this.consumer.disconnect();
                } finally {
                    process.kill(process.pid, type);
                }
            })
        });



    }


}