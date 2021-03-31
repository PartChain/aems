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
 * Investigation  Relationship model
 * @param sequelize
 * @param DataTypes
 * @constructor
 */

export default function InvestigationRelationshipModel(sequelize: Sequelize, DataTypes: any) {
    return sequelize.define('investigation_relationship', {
            investigation_id: {
                type: DataTypes.TEXT,
                primaryKey: true
            },
            serial_number_customer: {
                type: DataTypes.TEXT,
                primaryKey: true
            },
            shared_with_org: {
                type: DataTypes.TEXT,
                primaryKey: true
            },

        },
        {
            tableName: 'investigation_relationships',
            indexes: [
                {
                    name: 'investigation_id_relationship_index',
                    unique: false,
                    fields: ['investigation_id']
                },
                {
                    name: 'investigation_serial_number_customer_relationship_index',
                    unique: false,
                    fields: ['serial_number_customer']
                },
                {
                    name: 'shared_with_org_index',
                    unique: false,
                    fields: ['shared_with_org']
                }
            ]
        });
};