
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

import { Wallets } from 'fabric-network';
import { readFileSync } from 'fs';
import { join } from 'path';
import Logger from "../logger/Logger";

/**
 *
 */
export default class Wallet {

    /**
     *
     */
    wallet: any;

    /**
     *
     */
    certFile: string;

    /**
     *
     */
    keyFile: string;

    /**
     *
     */
    configPath: string;

    /**
     *
     * @param certFile
     * @param keyFile
     * @param configPath
     */
    constructor(certFile: string, keyFile: string, configPath: string) {
        this.certFile = certFile;
        this.keyFile = keyFile;
        this.configPath = configPath;
    }

    /*
     *
     *
     */
    get instance() {
        return this.wallet;
    }

    /**
     *
     * @param username
     * @param mspID
     * @param mspPath
     */
    async createIdentity(username: string, mspID: string, mspPath: string) {
        try {
            this.wallet = await Wallets.newInMemoryWallet();
            const cryptoConfigPath = join(__dirname, this.configPath, mspPath);
            const signCert = readFileSync(join(cryptoConfigPath, this.certFile)).toString();
            const keyFile = readFileSync(join(cryptoConfigPath, this.keyFile)).toString();

            const x509Identity = {
                credentials: {
                    certificate: signCert,
                    privateKey: keyFile,
                },
                mspId: mspID,
                type: 'X.509',
            };
            await this.wallet.put(username, x509Identity);

            Logger.debug(`Identity ${username} added into the wallet.`);
        } catch (error) {
            Logger.error(`Error adding to wallet. ${error}`);
            Logger.error(error.stack);
        }
    }
}
