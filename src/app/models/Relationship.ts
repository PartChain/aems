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
 * Relationship model
 * @param sequelize
 * @param DataTypes
 * @constructor
 */

export default function RelationshipModel(sequelize: Sequelize, DataTypes: any) {
    return sequelize.define('relationship', {
            parent_serial_number_customer: {
                type: DataTypes.TEXT,
                primaryKey: true
            },
            child_serial_number_customer: {
                type: DataTypes.TEXT,
                primaryKey: true
            },
            parent_mspid: {
                type: DataTypes.TEXT
            },
            child_mspid: {
                type: DataTypes.TEXT
            },
            transfer_status: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            retries: {
                type: DataTypes.INTEGER,
                defaultValue: 0 // Maybe set this automatically?
            },
            last_retry: {
                type: DataTypes.DATE // Maybe set this automatically? https://github.com/sequelize/sequelize/issues/5561#issuecomment-587040312
            }

        },
        {
            tableName: 'relationships',
            indexes: [
                {
                    name: 'parent_serial_number_customer_index',
                    unique: false,
                    fields: ['parent_serial_number_customer']
                },
                {
                    name: 'child_serial_number_customer_index',
                    unique: false,
                    fields: ['child_serial_number_customer']
                },
                {
                    name: 'transfer_status_index',
                    unique: false,
                    fields: ['transfer_status']
                }
            ]
        });
};
