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

import Payload from './Payload';
import Logger from './../logger/Logger';
// Turn of default debug logging
Logger.level = 'fatal';

describe('Payload Unit Tests', () => {

    const payload = {
        test: 'value'
    };

    const json = JSON.parse(JSON.stringify(payload));

    const buffer = new Buffer(JSON.stringify(json));

    test('test of extra comma removing from JSON string', () => {
        const string = '{\"test\":"value",}';
        const stringWithSpace = '{\"test\":"value", }';
        const stringWithoutComma = '{\"test\":"value"}';
        expect(Payload.removeExtraComma(string)).toBe(stringWithoutComma);
        expect(Payload.removeExtraComma(stringWithSpace)).toBe(stringWithoutComma);
        expect(Payload.removeExtraComma(stringWithoutComma)).toBe(stringWithoutComma);
    });

    test('test JSON payload to Buffer', () => {
        expect(Payload.toBuffer(json)).toStrictEqual(buffer);
    });

    test('test Buffer payload to JSON', () => {
        expect(Payload.toJSON([ buffer ])).toStrictEqual(json);
    });

});
