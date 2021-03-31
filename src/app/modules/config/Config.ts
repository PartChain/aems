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

import * as lodash  from 'lodash';

/**
 * @class Config
 */
export class Config {

    /**
     *
     */
    env: any;

    /**
     *
     */
    options: any = {};

    /**
     *
     */
    constructor(){
        this.env = process.env;
    }

    /**
     *
     * @param options
     * @param defaults
     */
    merge(options: any, defaults: any = {}) {
        this.options = lodash.merge(
            this.options,
            defaults,
            options
        );
        return this;
    }

    /**
     *
     * @param key
     */
    getEnv(key: string) {
        return this.browseRecursive(
            Config.parsePath(key),
            this.env
        );
    }

    /**
     *
     * @param key
     */
    getOption(key: string) {
        return this.browseRecursive(
            Config.parsePath(key),
            this.options
        );
    }

    /**
     *
     */
    getOptions() {
        return this.options;
    }

    /**
     *
     * @param path
     */
    static parsePath(path: string) {
        return path.split('.');
    }

    /**
     *
     * @param path
     * @param object
     * @param defaultReturn
     */
    browseRecursive(path: Array<string>, object: any, defaultReturn: any = undefined) {
        return path.reduce(
            (acc: any, key: string) => {
                if (!!acc[key])  {
                    acc = acc[key];
                } else {
                    acc = undefined;
                }

                return acc;
            }, object
        );
    }
}

/**
 * @export Config
 */
export default new Config;
