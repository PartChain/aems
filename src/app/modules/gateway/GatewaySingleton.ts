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
import {Gateway as FabricGateway} from "fabric-network/lib/gateway";
import {  GatewayOptions, DefaultEventHandlerStrategies } from 'fabric-network';
import Wallet from "../wallet/Wallet";
import {safeLoad} from "js-yaml";
import {readFileSync} from "fs";
import defaults from "../../defaults";
import * as customErrors from '../error/CustomErrors'


/**
 * Singleton Class which hold all Gateways which are needed to communicate with the difference peers
 * https://medium.com/javascript-everyday/singleton-made-easy-with-typescript-6ad55a7ba7ff
 */
export default class GatewaySingleton {
    private static instance: GatewaySingleton;
    private readonly Gateways: any;
    private hlfIdentities: any;

    private constructor() {
        Logger.info("Creating GatewaySingleton now");
        this.Gateways = Object.create({});
    }

    static async getInstance(): Promise<GatewaySingleton> {
        Logger.debug("In getInstance now");
        if (!GatewaySingleton.instance) {
            GatewaySingleton.instance = new GatewaySingleton();
            await GatewaySingleton.instance.setup();
        }
        return GatewaySingleton.instance;
    }

    /**
     * Loads the HLF Identities at startup
     */
    async setup() {
        let hlfIdentitiesBuffer = await readFileSync(defaults.hlfIdentitiesFilePath);
        this.hlfIdentities = JSON.parse(hlfIdentitiesBuffer.toString());
    }


    /**
     * Returns a Gateway based on a mspID
     * @param mspID
     */
    async getGateway(mspID: any) {
        Logger.debug("In getGateway now");
        if (!this.Gateways.hasOwnProperty(mspID)) {
            this.Gateways[mspID] = await this.createGateway(mspID);
        }
        return this.Gateways[mspID];

    }

    /**
     * Creates a Gateway based on mspID
     * @param mspID
     */
    async createGateway(mspID: any) {
        Logger.info("In createGateway now");

        this.validateHLFIdentityFile(mspID);

        const gateway = new FabricGateway();
        Logger.debug(`Fetching gateway connectionProfile`);
        const connectionProfile = GatewaySingleton.getConnectionProfile(this.hlfIdentities[mspID]["HLF_NETWORK_PROFILE"]);
        Logger.debug(`Gateway connectionProfile: ${JSON.stringify(connectionProfile)}`);

        Logger.debug(`Type of Gateway connectionProfile: ${typeof connectionProfile}`);
        // Logger.info(`Gateway Options: ${JSON.stringify(gateway.getOptions())}`);
        Logger.debug(`Successfully got gateway options `);
        const wallet = new Wallet(
            this.hlfIdentities[mspID]["HLF_IDENTITY_CERT_PATH"],
            this.hlfIdentities[mspID]["HLF_IDENTITY_KEY_PATH"],
            this.hlfIdentities[mspID]["HLF_IDENTITY_CONFIG_PATH"]
        )
        await wallet.createIdentity(
            this.hlfIdentities[mspID]["HLF_IDENTITY_USERNAME"],
            this.hlfIdentities[mspID]["HLF_IDENTITY_MSP_ID"],
            this.hlfIdentities[mspID]["HLF_IDENTITY_MSP_PATH"]
        );
        const connectionOptions = GatewaySingleton.getConnectionOptions(this.hlfIdentities[mspID]["HLF_IDENTITY_USERNAME"], wallet);
        
        Logger.debug(`Gateway connection options = ${JSON.stringify(connectionOptions)} `);
        await gateway.connect(JSON.parse(JSON.stringify(connectionProfile)), connectionOptions);
        Logger.info(`Created Gateway to ${mspID} peer`);
        return gateway;

    }

    /**
     * Returns the idenities
     */
    getHLFIdentities() {
        return this.hlfIdentities;
    }

    /**
     *
     * @static
     * @param networkProfile
     */
    static getConnectionProfile(networkProfile: string): string | object {
        return safeLoad(
            readFileSync(networkProfile, 'utf8')
        );
    }

    /**
     *
     * @static
     * @param username
     * @param wallet
     */
    static getConnectionOptions(username: string, wallet: Wallet) {
         const connectOptions: GatewayOptions = {
            identity: username,
            wallet: wallet.instance,        
            eventHandlerOptions: {
              commitTimeout: 100,
              strategy: DefaultEventHandlerStrategies.MSPID_SCOPE_ANYFORTX
              },
            discovery: {
                enabled: true,
                asLocalhost: false
            }
        };
        return connectOptions;
    }

    /**
     * Checks if all necessary keys are present in the identity file for the given mspID
     * @param mspID
     */
    validateHLFIdentityFile(mspID: string){
        if (!this.hlfIdentities.hasOwnProperty(mspID)) {
            throw new customErrors.DeploymentError(`mspID ${mspID} not in ${defaults.hlfIdentitiesFilePath}!`);
        }
        const properties: Array<string> = ["HLF_NETWORK_PROFILE","HLF_NETWORK_CHAINCODE_ID", "HLF_IDENTITY_CERT_PATH",
            "HLF_IDENTITY_KEY_PATH", "HLF_IDENTITY_CONFIG_PATH", "HLF_IDENTITY_USERNAME", "HLF_IDENTITY_MSP_ID", "HLF_IDENTITY_MSP_PATH"];

        for(let property of properties){
            if (!this.hlfIdentities[String(mspID)].hasOwnProperty(property)) {
                throw new customErrors.DeploymentError(`${defaults.hlfIdentitiesFilePath} is missing property ${property} for mspID ${mspID}`);
            }
        }
    }

}