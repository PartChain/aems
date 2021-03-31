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

import * as log4js from 'log4js';
import env from '../../defaults';
import _ = require("lodash");

/**
 * @class Logger
 */
class Logger {

    /**
     *
     */
    log: any;

    /**
     *
     */
    constructor() {
        this.log = Logger.getLogger();
        this.level = env.loggingLevel;
        this.log.info(`Started Logger with logging level ${env.loggingLevel}`);
    }

    /**
     *
     * @param level
     */
    set level(level: string) {
        this.log.level = level;
    }

    /**
     *
     * @param name
     */
    static getLogger(name: string = null) {
        return log4js.getLogger(name);
    }

    /**
     *
     * @param config
     */
    static applyConfig(config: any) {
        return log4js.configure(config);
    }

    /**
     *
     * @param message
     */
    trace(message: string) {
        this.log.trace(message);
    }

    /**
     *
     * @param message
     */
    debug(message: string) {
        this.log.debug((_.isObject(message) ? JSON.stringify(message) : message).slice(0, 2000));
    }
    /**
     *
     * @param message
     */
    info(message: string) {
        if (message.length > 1000) {
            this.log.info(_.isObject(message) ? JSON.stringify(message) : message.slice(0, 1000) + '...');
        } else {
            this.log.info(message);
        }
    }

    /**
     *
     * @param message
     */
    warn(message: string) {
        this.log.warn(message);
    }

    /**
     *
     * @param message
     */
    error(message: string) {
        this.log.error(message);
    }

    /**
     *
     * @param message
     */
    fatal(message: string) {
        this.log.fatal(message);
    }

}

export default new Logger;
