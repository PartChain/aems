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

import validateAssetList, {AssetList} from "./AssetValidator";

describe('Asset Validator Unit Tests', () => {

    // good asset
    const assets: any = [
        {
            "manufacturer": "company",
            "productionCountryCodeManufacturer": "DE",
            "partNameManufacturer": "partName",
            "partNumberManufacturer": "TestCar65",
            "partNumberCustomer": "partNumber",
            "serialNumberManufacturer": "serialNumber0001",
            "serialNumberCustomer": "serialNumber0001",
            "serialNumberType": "SINGLE",
            "qualityStatus": "OK",
            "qualityHash": "123",
            "qualityDocuments": Object.create({}),
            "componentsSerialNumbers": ["test"],
            "status": "PRODUCED",
            "productionDateGmt": "2020-10-05T10:39:33.000Z",
            "manufacturerPlant": "",
            "manufacturerLine": "",
            "customFields": Object.create({}),
        }
    ];
    test('happy path', () => {

        expect(validateAssetList(assets)).toStrictEqual(assets);
    });

    test('wrong date', () => {
        let cloned = assets.map((x: any) => Object.assign({}, x));
        cloned[0].productionDateGmt = "date";
        let thrownError;

        try {
            validateAssetList(cloned);
        } catch (error) {
            thrownError = error;
        }
        expect(thrownError).toHaveProperty("stack");
    });

    test('wrong serialNumberCustomer I', () => {
        let cloned = assets.map((x: any) => Object.assign({}, x));
        cloned[0].serialNumberCustomer = "";
        let thrownError;

        try {
            validateAssetList(cloned);
        } catch (error) {
            thrownError = error;
        }
        expect(thrownError).toHaveProperty("stack");
    });

    test('wrong serialNumberCustomer', () => {
        let cloned = assets.map((x: any) => Object.assign({}, x));
        delete cloned[0].serialNumberCustomer;
        let thrownError;

        try {
            validateAssetList(cloned);
        } catch (error) {
            thrownError = error;
        }
        expect(thrownError).toHaveProperty("stack");
    });

    test('wrong qualityStatus', () => {
        let cloned = assets.map((x: any) => Object.assign({}, x));
        cloned[0].qualityStatus = "NOKOK";
        let thrownError;

        try {
            validateAssetList(cloned);
        } catch (error) {
            thrownError = error;
        }
        expect(thrownError).toHaveProperty("stack");
    });

    test('wrong serialNumberType', () => {
        let cloned = assets.map((x: any) => Object.assign({}, x));
        cloned[0].serialNumberType = "wrongType";
        let thrownError;

        try {
            validateAssetList(cloned);
        } catch (error) {
            thrownError = error;
        }
        expect(thrownError).toHaveProperty("stack");
    });

    test('wrong Country Code', () => {
        let cloned = assets.map((x: any) => Object.assign({}, x));
        cloned[0].productionCountryCodeManufacturer = "country";
        let thrownError;

        try {
            validateAssetList(cloned);
        } catch (error) {
            thrownError = error;
        }
        expect(thrownError).toHaveProperty("stack");
    });

    test('wrong componentSerialNumbers', () => {
        let cloned = assets.map((x: any) => Object.assign({}, x));
        cloned[0].componentsSerialNumbers = ["test", "test", null, ""]

        const result: AssetList = validateAssetList(cloned);

        expect(result[0].componentsSerialNumbers).toEqual(expect.arrayContaining(["test"]))
    });

    test('serialNumberManufacturer in componentSerialNumbers', () => {
        let cloned = assets.map((x: any) => Object.assign({}, x));
        cloned[0].componentsSerialNumbers = ["serialNumber0001", null]
        let thrownError;

        try {
            validateAssetList(cloned);
        } catch (error) {
            thrownError = error;
        }
        expect(thrownError).toHaveProperty("stack");
    });


    test('Too much assets at once', () => {
        let thrownError;
        const cloned = Array(101).fill(assets[0])
        try {
            validateAssetList(cloned);
        } catch (error) {
            thrownError = error;
        }
        expect(thrownError).toHaveProperty("stack");
    });

});