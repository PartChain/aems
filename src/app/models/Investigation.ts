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

import {Sequelize} from "sequelize";
/**
 * Investigation model
 * @param sequelize
 * @param DataTypes
 * @constructor
 */

export default function InvestigationModel(sequelize: Sequelize, DataTypes: any) {
    return sequelize.define('investigation', {
            investigation_id: {
                type: DataTypes.TEXT,
                primaryKey: true
            },
            investigation_serial_number_customer: {
                type: DataTypes.TEXT,
                primaryKey: true
            },
            org_mspid: {
                type: DataTypes.TEXT,
                primaryKey: true
            },
            investigation_status: {
                type: DataTypes.INTEGER
            },
            investigation_retries: {
                type: DataTypes.INTEGER,
                defaultValue: 0 // Maybe set this automatically?
            },
            investigation_last_retry: {
                type: DataTypes.DATE // Maybe set this automatically? https://github.com/sequelize/sequelize/issues/5561#issuecomment-587040312
            }

        },
        {
            tableName: 'investigations',
            indexes: [
                {
                    name: 'investigation_id_index',
                    unique: false,
                    fields: ['investigation_id']
                },
                {
                    name: 'investigation_serial_number_customer_index',
                    unique: false,
                    fields: ['investigation_serial_number_customer']
                },
                {
                    name: 'investigation_status_index',
                    unique: false,
                    fields: ['investigation_status']
                }
            ]
        });
};