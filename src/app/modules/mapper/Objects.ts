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

/**
 * Object helpers class
 * @class Objects
 * @module Mapper
 */
import Logger from "../logger/Logger";

export default class Objects {

    /**
     *
     * @param object
     * @param mapper
     */
    static map(object: object, mapper: any): any {
        return Object.entries(object).reduce(
            (acc: any, [key, value]) => mapper(acc, key, value), Object()
        );
    }

    /**
     *
     * @param object
     * @param mapper
     */
    static mapKeys(object: object, mapper: any): any {
        return Objects.map(
            object, (acc: any, key: any, value: any) => {
                acc[mapper(key)] = value;
                return acc;
            }
        );
    }

    /**
     *
     * @param object
     * @param mapper
     */
    static mapNestedKeys(object: any, mapper: any) {
        // source https://matthiashager.com/converting-snake-case-to-camel-case-object-keys-with-javascript

        if (this.isObject(object)) {
            const n = {};

            Object.keys(object)
                .forEach((k: string) => {
                    // @ts-ignore
                    n[mapper(k)] = this.mapNestedKeys(object[k], mapper);
                });

            return n;
        } else if (this.isArray(object)) {
            return object.map((i: any) => {
                return this.mapNestedKeys(i, mapper);
            });
        }

        return object;
    }

    /**
     *
     * @param object
     * @param mapper
     */
    static mapValues(object: object, mapper: any): any {
        return Objects.map(
            object, (acc: any, key: any, value: any) => {
                acc[key] = mapper(value);
                return acc;
            }
        );
    }

    /**
     *
     */

    static isArray(a: any) {
        return Array.isArray(a);
    };

    static isObject(o: any) {
        return o === Object(o) && !this.isArray(o) && typeof o !== 'function' && typeof o.getMonth !== 'function';
    }

    /**
     * Check if the given object has any empty keys
     * @param o
     */
    static checkForEmptyPropertiesInObject(o: any) {
        for (let key in o) {
            if (typeof o[key] === 'object' && o[key] !== null) {
                Objects.checkForEmptyPropertiesInObject(o[key]);
            } else {
                if (o[key] === undefined || o[key] === null) {
                    Logger.error(`Missing values for this property: ${key}`);
                    //throw new Error(`Missing values for these properties: ${key}`)
                }
            }
        }

    }

}
