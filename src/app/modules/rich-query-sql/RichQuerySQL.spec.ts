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

import RichQuerySQL from "./RichQuerySQL";
import Strings from "../mapper/Strings";

describe('Rich Query SQL Unit Tests', () => {

    test('conversion of filter object with manufacturer value and regex=false to rich query', () => {
        const filterObject = {
            'manufacturer': {
                'value': 'Company',
                'regex': false
            }
        };

        const queryObject = {
            'query': {
                'selector': {
                    'manufacturer': {
                        "whereClause": " = :manufacturer ",
                        "replacement": {"manufacturer": "Company"}
                    }
                },
                'fields': RichQuerySQL.defaultFields.map((
                    (field: any) => Strings.camelCaseToSnakeCase(field)
                ))
            }
        };

        expect(JSON.stringify(RichQuerySQL.create(filterObject, "lion"))).toStrictEqual(JSON.stringify(queryObject));
    });

    test('conversion of filter object with partNameNumber value and regex=true to rich query', () => {
        const filterObject = {
            'partNameNumber': {
                'value': '1234',
                'regex': true
            }
        };

        const value = "1234"
        const queryObject = {
            'query': {
                'selector': {
                    'part_name_number': {
                        "whereClause": `(part_name_manufacturer ~ :PartNameNumber OR part_number_manufacturer ~ :PartNameNumber OR part_number_customer ~ :PartNameNumber OR serial_number_customer ~ :PartNameNumber) `,
                        "replacement": {"PartNameNumber": '1234'}
                    }
                },
                'fields': RichQuerySQL.defaultFields.map((
                    (field: any) => Strings.camelCaseToSnakeCase(field)
                ))
            }
        };

        expect(JSON.stringify(RichQuerySQL.create(filterObject, "lion"))).toStrictEqual(JSON.stringify(queryObject));
    });


    test('conversion of filter object with quality status value "nok" to rich query', () => {
        const filterObject = {
            'qualityStatus': {
                'value': 'NOK'
            }
        };

        const queryObject = {
            'query': {
                'selector': {
                    'quality_status': {
                        "whereClause": " = :qualityStatus ",
                        "replacement": {"qualityStatus": "NOK"}
                    }
                },
                'fields': RichQuerySQL.defaultFields.map((
                    (field: any) => Strings.camelCaseToSnakeCase(field)
                ))
            }
        };

        expect(JSON.stringify(RichQuerySQL.create(filterObject, "lion"))).toStrictEqual(JSON.stringify(queryObject));
    });

    test('conversion of filter object with production date gmt range to rich query', () => {
        const filterObject = {
            'productionDateFrom': {
                'value': '2019-08-01'
            },
            'productionDateTo': {
                'value': '2019-08-20'
            }
        };

        const queryObject = {
            'query': {
                'selector': {
                    'production_date_gmt': {
                        "whereClause": " >= :productionDateFrom AND production_date_gmt <= :productionDateTo ",
                        "replacement": {
                            "productionDateFrom": "2019-08-01",
                            "productionDateTo": "2019-08-20"
                        }
                    }
                },
                'fields': RichQuerySQL.defaultFields.map((
                    (field: any) => Strings.camelCaseToSnakeCase(field)
                ))
            }
        };

        expect(JSON.stringify(RichQuerySQL.create(filterObject, "lion"))).toStrictEqual(JSON.stringify(queryObject));
    });

    test('conversion of filter object with only production date gmt from to rich query', () => {
        const filterObject = {
            'productionDateFrom': {
                'value': '2019-08-01'
            }
        };

        const queryObject = {
            'query': {
                'selector': {
                    'production_date_gmt': {
                        "whereClause": " > :productionDateFrom ",
                        "replacement": {
                            "productionDateFrom": "2019-08-01"
                        }
                    }
                },
                'fields': RichQuerySQL.defaultFields.map((
                    (field: any) => Strings.camelCaseToSnakeCase(field)
                ))
            }
        };

        expect(JSON.stringify(RichQuerySQL.create(filterObject, "lion"))).toStrictEqual(JSON.stringify(queryObject));
    });


    test('wrong filter', () => {
        let filter = {
            "filter": {
                "type": {}
            },
            "loadChildrenLevel": 2,
            "pagination": 1
        }
        let thrownError;

        try {
            RichQuerySQL.create(filter, "Lion");
        } catch (error) {
            thrownError = error;
        }
        expect(thrownError).toHaveProperty("stack");
    });

});
