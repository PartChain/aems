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

import Objects from "./Objects";
import Strings from "./Strings";

describe('Object Mapper Unit Tests', () => {
    const object = {
        test_key: 'test value',
        test_key2: 'test value 2'
    };

    test('mapping of object with custom mapping function', () => {
        const mapped = Objects.map(object, (acc: any, key: any, value: any) => {
            const newKey = Strings.snakeCaseToCamelCase(key);
            acc[newKey] = value;
            return acc;
        });

        const expected = {
            testKey: 'test value',
            testKey2: 'test value 2'
        };

        expect(mapped).toStrictEqual(expected);
    });

    test('mapping of object keys with custom mapping function', () => {
        const mapped = Objects.mapKeys(object, Strings.snakeCaseToCamelCase);

        const expected = {
            testKey: 'test value',
            testKey2: 'test value 2'
        };

        expect(mapped).toStrictEqual(expected);
    });

    test('mapping of object values with custom mapping function', () => {
        const mapped = Objects.mapValues(object, Strings.stringToPascalCase);

        const expected = {
            test_key: 'TestValue',
            test_key2: 'TestValue2'
        };

        expect(mapped).toStrictEqual(expected);
    });
});
