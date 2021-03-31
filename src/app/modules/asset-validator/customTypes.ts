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

import * as t from "io-ts";
import { either } from 'fp-ts/Either'
import Iterable from "../iterable/Iterable";
import _ = require("lodash");

/**
 *  Checks if the date is longer than 6 digits and checks if it can be converted to a valid Date
 */
export const validDateCheck = new t.Type<string, string, unknown>(
    'validDateCheck',
    (u): u is string => u instanceof String,
    (u, c) =>
        either.chain(t.string.validate(u, c), (s: string) => {
            const d = new Date(s)
            return isNaN(d.getTime())  && s.length < 7  ? t.failure(u, c, `${s} is the the wrong productionDateGmt format. It needs to be a valid Date (e.g. ISO format)`) : t.success(d.toISOString())
        }),
    a => a
)


/**
 * Filters the componentsSerialNumbers by removed null and duplicate values
 */
export const validComponentSerialNumbersCheck = new t.Type<Array<string>, Array<string>, unknown>(
    'validComponentSerialNumbersCheck',
    (u): u is Array<string> => u instanceof Array,
    (u, c: any) =>
        _.includes(Iterable.create(u), c[0].actual[0].serialNumberCustomer) ||  _.includes(Iterable.create(u), c[0].actual[0].serialNumberManufacturer)? t.failure(u, c, `serialNumberManufacturer or serialNumberCustomer is in componentSerialNumbers [${u.toString()}], which is not allowed!`): t.success([...new Set (_.compact(Iterable.create(u)))]),
    a => a
)