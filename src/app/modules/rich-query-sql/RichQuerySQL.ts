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

import Logger from './../logger/Logger';
import Objects from "../mapper/Objects";
import Strings from "../mapper/Strings";
import * as customErrors from "../error/CustomErrors";
/**
 * @class RichQuerySQL
 * @module RichQuerySQL
 */
export default class RichQuerySQL {

    static defaultFields = [
        'serialNumberManufacturer',
        'serialNumberCustomer',
        'serialNumberType',
        'partNameManufacturer',
        'manufacturer',
        'manufacturerLine',
        'manufacturerPlant',
        'partNumberManufacturer',
        'qualityStatus',
        'productionDateGmt',
        'partNumberCustomer',
        'productionCountryCodeManufacturer',
        'status',
        'componentsSerialNumbers',
        'qualityDocuments',
        'customFields',
        'mspid'
    ];

    /**
     * Create Rich Query object from filter payload
     * @static
     * @param filter
     * @param mspIDFromJWT
     * @param customFields
     */
    static create(filter: any, mspIDFromJWT: string, customFields: Array<string> = undefined) {
        let fields = (
            customFields
                ? customFields
                : RichQuerySQL.defaultFields
        );
        Logger.debug(`customFields provided: ${customFields}`);

        // We need at least "serialNumberCustomer"
        if (fields.indexOf("serialNumberCustomer") === -1) {
            fields.push("serialNumberCustomer");
        }

        Logger.debug(`${fields}`);

        let richQuery: any = {
            'selector': Object.create({}),
            'fields': fields
        };

        Object.entries(filter).forEach(
            (property, key) => {
                if (filter.hasOwnProperty(property[0]) && this.isSet(property[1])) {
                    this.processProperty(richQuery, property[0], property[1], mspIDFromJWT);
                }
            }
        );

        // Convert fields and keys to snake case for Postgres
        richQuery.selector = Objects.mapKeys(richQuery.selector, Strings.camelCaseToSnakeCase);
        richQuery.fields = richQuery.fields.map((
            (field: any) => Strings.camelCaseToSnakeCase(field)
        ));

        Logger.debug('SQL Query Conditions: ' + JSON.stringify({'query': JSON.stringify(richQuery)}));

        return {'query': richQuery};
    }

    /**
     * Check if value is set
     * @static
     * @protected
     * @param prop
     */
    protected static isSet(prop: any) {
        const value = String(prop.value);
        return (value !== null && value.length > 0 && value.toLowerCase() !== 'all');
    }

    /**
     * Augment rich query with selector of property
     * @static
     * @protected
     * @param richQuery
     * @param key
     * @param property
     * @param mspIDFromJWT
     */
    protected static processProperty(richQuery: any, key: any, property: any, mspIDFromJWT: string) {
        const regex = (property.hasOwnProperty('regex') ? property.regex : false);

        if (!property.hasOwnProperty("value")) {
            throw new customErrors.BadRequestError(`You have set ${key}, but the value is missing. It should look like this: {"${key}": {"value": "Enter Value here"}`);
        }

        switch (String(key)) {
            case 'type':
                richQuery.selector.mspid = this.getTypeSelector(property.value, mspIDFromJWT);
                break;
            case 'manufacturer':
                richQuery.selector.manufacturer = this.getBasicSelector("manufacturer", property.value, regex);
                break;
            case 'serialNumberManufacturer':
                richQuery.selector.serialNumberManufacturer = this.getBasicSelector("serialNumberManufacturer", property.value, regex);
                break;
            case 'serialNumberCustomer':
                richQuery.selector.serialNumberCustomer = this.getBasicSelector("serialNumberCustomer", property.value, regex);
                break;
            case 'productionCountryCode':
                richQuery.selector.productionCountryCodeManufacturer = this.getBasicSelector("productionCountryCodeManufacturer", property.value, regex);
                break;
            case 'partNameNumber':
                richQuery.selector.partNameNumber = this.getPartNameNumberSelector(property.value, regex);
                break;
            case 'qualityStatus':
                richQuery.selector.qualityStatus = this.getBasicSelector("qualityStatus", property.value, regex);
                break;
            case 'productionDateFrom':
            case 'productionDateTo':
                richQuery = this.getProductionDateSelector(property.value, key, richQuery);
                break;
            case 'serialNumberManufacturerList':
                richQuery.selector.serialNumberManufacturer = this.getSerialNumberManufacturerListSelector(property.value);
                break;
            case 'serialNumberCustomerList':
                richQuery.selector.serialNumberCustomer = this.getSerialNumberManufacturerListSelector(property.value);
                break;
            case 'mspid':
                richQuery.selector.mspid = this.getBasicSelector("mspid", property.value, regex);
                break;
        }
    }

    /**
     * Get type selector object
     * @param value
     * @param mspIDFromJWT
     */
    protected static getTypeSelector(value: string, mspIDFromJWT: string) {

        if (value.toLowerCase() === 'own') {
            return {
                "whereClause": " = :mspid ",
                "replacement": {"mspid": mspIDFromJWT}
            };
        } else {
            return {
                "whereClause": " != :mspid ",
                "replacement": {"mspid": mspIDFromJWT}
            };
        }
    }

    /**
     * Get basic selector object
     * @static
     * @protected
     * @param key
     * @param value
     * @param regex
     */
    protected static getBasicSelector(key: string, value: string, regex: boolean = false) {

        let returnObject = Object.create({});
        if (regex) {
            returnObject["whereClause"] = ` ~ :${key} `;
        } else {
            returnObject["whereClause"] = ` = :${key} `;
        }
        returnObject["replacement"] = {};
        returnObject["replacement"][key] = value;
        return returnObject;

    }

    /**
     * Get selector object for PartNameNumber
     * @static
     * @protected
     * @param value
     * @param regex
     */
    protected static getPartNameNumberSelector(value: any, regex: boolean = false) {

        const operator = regex ? "~" : "=";

        return {
            "whereClause": `(part_name_manufacturer ${operator} :PartNameNumber OR part_number_manufacturer ${operator} :PartNameNumber OR part_number_customer ${operator} :PartNameNumber OR serial_number_customer ${operator} :PartNameNumber) `,
            "replacement": {"PartNameNumber": value}
        };
    }

    /**
     * Get selector object for ProductionDateGmt
     * @static
     * @protected
     * @param value
     * @param key
     * @param richQuery
     */
    protected static getProductionDateSelector(value: any, key: any, richQuery: any) {

        // If filter has both From and To make in between query
        // If filter has only From query make  where time > target_date
        // If filter has only To query make where time < target_date

        if(richQuery.selector.productionDateGmt) {
            //  https://wiki.postgresql.org/wiki/Don't_Do_This#Don.27t_use_BETWEEN_.28especially_with_timestamps.29
            richQuery.selector.productionDateGmt.whereClause = ` >= :productionDateFrom AND production_date_gmt <= :productionDateTo `;
            richQuery.selector.productionDateGmt.replacement[key] = value;
        }
        else{
            if (key === 'productionDateFrom') {
                richQuery.selector.productionDateGmt = {
                    "whereClause": ` > :productionDateFrom `,
                    "replacement": {"productionDateFrom": value}
                };
            } else if (key === 'productionDateTo') {
                richQuery.selector.productionDateGmt = {
                    "whereClause": ` < :productionDateTo `,
                    "replacement": {"productionDateTo": value}
                };
            }

        }


        return richQuery;
    }

    /**
     * Get SerialNumberManufacturer list selector object
     * @static
     * @protected
     * @param list
     */
    protected static getSerialNumberManufacturerListSelector(list: any) {
        return {
            "whereClause": ` IN (:serialNumberManufacturer) `,
            "replacement": {"serialNumberManufacturer": list}
        };
    }

}
