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

import Config, { Config as StaticConfig } from './Config';
import Logger from './../logger/Logger';
// Turn of default debug logging
Logger.level = 'fatal';

describe('Config Unit Tests', () => {

    const options = {
        option: 'from config'
    };

    const nestedOptions = {
        option: {
            nested: 'nested option'
        }
    };

    const defaults = {
        option: 'from defaults'
    };

    const path = 'option.nested';

    const arrayPath = ['option', 'nested'];

    // load data to object
    Config.merge(options, defaults);

    test('test ENV variables parsing', () => {
        process.env.NODE_ENV = 'testing';
        expect(Config.getEnv('NODE_ENV')).toBe('testing');
        // Test change
        process.env.NODE_ENV = 'production';
        expect(Config.getEnv('NODE_ENV')).toBe('production');
    });

    test('test config merge', () => {
        expect(Config.merge({}, defaults).getOptions()).toStrictEqual(defaults);
        expect(Config.merge(options, defaults).getOptions()).toStrictEqual(options);
    });

    test('get options', () => {
        expect(Config.getOptions()).toStrictEqual(options);
    });

    test('get option', () => {
        expect(Config.getOption('option')).toBe(options.option);
    });

    test('get option nested dot syntax', () => {
        Config.merge(nestedOptions, defaults);
        expect(Config.getOption(path)).toBe(nestedOptions.option.nested);
    });

    test('parse path', () => {
        expect(StaticConfig.parsePath(path)).toStrictEqual(arrayPath);
    });

    test('recursive object browsing', () => {
        expect(Config.browseRecursive(arrayPath, nestedOptions)).toBe(nestedOptions.option.nested);
    });

});
