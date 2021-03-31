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

import * as t from 'io-ts'
import {Country} from "../../enums/Countries";
import {isLeft} from 'fp-ts/Either'
import {PathReporter} from 'io-ts/PathReporter'
import * as D from "io-ts/Decoder"
import * as customErrors from "../error/CustomErrors";
import {validComponentSerialNumbersCheck, validDateCheck} from "./customTypes";
import {withFallback, withMessage} from "io-ts-types";
import Iterable from "../iterable/Iterable";
import {NonEmptyString} from "io-ts-types/NonEmptyString";


export type AssetList = D.TypeOf<typeof AssetList> | D.TypeOf<typeof Asset>;
export type Asset = D.TypeOf<typeof Asset>;

const Asset = t.intersection([
    t.type( //required keys
        {
            serialNumberManufacturer: withMessage(NonEmptyString,
                () => 'serialNumberManufacturer has to be present and not be an empty string!'),
            serialNumberCustomer: withMessage(NonEmptyString,
                () => 'serialNumberCustomer has to be present and not be an empty string!'),
            serialNumberType: withMessage(t.keyof({BATCH: null, SINGLE: null}), () => 'Only allowed values for serialNumberType are BATCH and SINGLE'),
            manufacturer: withMessage(NonEmptyString,
                () => 'manufacturer has to be present and not be an empty string!'),
            qualityStatus: withMessage(t.keyof({OK: null, NOK: null, FLAG: null}),
                () => 'Only allowed values for qualityStatus are OK, NOK and FLAG'),
            componentsSerialNumbers: validComponentSerialNumbersCheck,
            partNumberManufacturer: t.string,
            status: t.string,
            partNameManufacturer: t.string,
            partNumberCustomer: t.string,
            productionDateGmt: validDateCheck,
            productionCountryCodeManufacturer: withMessage(t.keyof(Object.keys(Country).reduce((o, key) => ({...o, [key]: null}), {})),
                () => 'productionCountryCodeManufacturer is not a valid ISO 3166-1 alpha-2 code' +
                    ' (see https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2#Officially_assigned_code_elements)'),
            manufacturerPlant: withFallback(t.string, ""),
            manufacturerLine: withFallback(t.string, ""),
            qualityDocuments: withFallback(t.UnknownRecord, {}),
            customFields: withFallback(t.UnknownRecord, {})
        }
    ), t.partial( // optional keys
        {
            mspID: t.string,
        }
    )])

const AssetList =  t.array(Asset);

export default function validateAssetList(assetList: AssetList) {

    assetList = Iterable.create(assetList);
    if(assetList.length > 100){
        throw new customErrors.BadRequestError(`You cannot send more than 100 assets at once!`)
    }
    const resultDecode = AssetList.decode(assetList);
    if (isLeft(resultDecode)) {
        const resultReport = PathReporter.report(resultDecode);
        throw new customErrors.BadRequestError(resultReport.toString());
    }
    return resultDecode.right;
}


