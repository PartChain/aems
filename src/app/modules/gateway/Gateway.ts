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

import Logger from "../logger/Logger";
import * as util from 'util'
import GatewaySingleton from "./GatewaySingleton";
import _ = require("lodash");

/**
 * @class Gateway
 */
export default class Gateway {


    /**
     * @type Array<any>
     */
    connections: any;

    /**
     * @constructor Gateway
     * @abstract
     */
    constructor() {
        this.connections = Object.create({});
    }

    /**
     *
     * @static
     * @async
     * @param mspID
     * @param channelName
     * @param chaincodeID
     */
    static async connect(mspID: string, channelName: string, chaincodeID: string) {
        Logger.debug(`Initializing gateway for channel "${channelName}" and mspID ${mspID}`);
        try {

            const gatewaySingleton: GatewaySingleton = await GatewaySingleton.getInstance();
            const gateway = await gatewaySingleton.getGateway(mspID);

            Logger.debug(`Successfully got gateway connection `);

            let contractName: string;
            if (chaincodeID.length > 0) {
                contractName = chaincodeID;
            } else {
                contractName = `${gatewaySingleton.getHLFIdentities()[mspID]["HLF_NETWORK_CHAINCODE_ID"]}`;
            }

            const network = await gateway.getNetwork(channelName);
            const contract = await network.getContract(contractName);
		    const channel = await network.getChannel();

            Logger.debug(`Gateway and contract for channel "${channelName}" using chaincode: "${contractName}" `);

            return {
                gateway: gateway,
                contract: contract,
                channelName: channelName,
                channel: channel
            };
        } catch (error) {
            Logger.error(`Error during preparation of Fabric-Client: ${JSON.stringify(error)}`);
            throw error;
        }
    }


    /**
     * @async
     * @param mspIDFromJWT
     * @param channelNames
     * @param chaincodeName
     * @return Promise<any>
     */
    async connectToMultipleChannels(mspIDFromJWT: string, channelNames: string[], chaincodeName: string): Promise<any> {
        this.connections[mspIDFromJWT] = [];
        try {
            Logger.debug(`Prepare connection for specific channels "${channelNames.toString()}"`);
            for (let channelName of channelNames) {

                const connection = await Gateway.connect(
                    mspIDFromJWT,
                    channelName,
                    chaincodeName
                );

                this.connections[mspIDFromJWT].push(connection);
                this.connections[mspIDFromJWT] = _.uniqBy(this.connections[mspIDFromJWT], 'channelName');
            }

            Logger.debug(`Connections list: ${util.inspect(this.connections)}`);
            return this.connections;
        } catch (error) {
            Logger.error(`Error during connect to multiple channels: ${error}`);
            throw error;
        }
    }

}
