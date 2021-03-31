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

import Server from './server';
import Options from './interfaces/Options';

/**
 * Bootstrap class of express application
 * @class App
 * @extends Server
 * @export App
 */
export default class App extends Server {

    /**
     * @constructor App
     * @param options
     */
    constructor(options: Options = {}) {
        super(options);
        // Start server
        this.listen();
    }
}
