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

import Logger from '../modules/logger/Logger';
import SmartContractClient from "../domains/SmartContractClient";
import defaults from "../defaults";
import GatewaySingleton from "../modules/gateway/GatewaySingleton";

/** 
 * Create Listener for smartcontract
 */

export default async function createContractListener() {
    Logger.debug(`Called createContractListener`);

    const client = new SmartContractClient;
    const gatewaySingleton: GatewaySingleton = await GatewaySingleton.getInstance();
    const chaincodeName = gatewaySingleton.getHLFIdentities()[defaults.hlfDefaultMspID]["HLF_NETWORK_CHAINCODE_ID"];
    Logger.info(`Setting up chaincode listener for channel ${defaults.channelName}, using default mspID ${defaults.hlfDefaultMspID} and chaincode ${chaincodeName}`);

    return await client.getContractConnection(
        [defaults.channelName],
        chaincodeName
    ).then(
        (response: any) => {
            Logger.info(`Chaincode event got setup successfully with response: ${response}`);
        }
    ).catch(
        (error: any) => {
            Logger.error(`Error in setting up the chaincode event ${error}`);
            throw new Error(`Error in setting up the chaincode event ${error}`);
        }
    );


}