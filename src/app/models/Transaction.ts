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
 * Transaction model
 * @param sequelize
 * @param DataTypes
 * @constructor
 */
export default function TransactionModel(sequelize: any, DataTypes: any) {
    return sequelize.define('transaction', getTransactionModelDefinition(DataTypes), getTransactionModelIndices());
};

export function getTransactionModelDefinition(DataTypes: any) {
    return {
        transaction_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        serial_number_customer: {
            type: DataTypes.TEXT
        },
        timestamp_created: {
            type: DataTypes.TEXT,
            defaultValue: DataTypes.NOW
        },
        timestamp_changed: {
            type: DataTypes.TEXT
        },
        property_new_value: {
            type: DataTypes.TEXT
        },
        property_old_value: {
            type: DataTypes.TEXT
        },
        status: {
            type: DataTypes.TEXT,
            defaultValue: "PENDING"
        },
        user_id: {
            type: DataTypes.TEXT
        },
        property_name: {
            type: DataTypes.TEXT
        }
    };
}

export function getTransactionModelIndices() {
    return {
        tableName: 'transactions',
        timestamps: false,
        indexes: [
            {
                name: 'serial_number_customer_transaction_index',
                unique: false,
                fields: ['serial_number_customer']
            },
            {
                name: 'status_index',
                unique: false,
                fields: ['status']
            },
            {
                name: 'property_new_value_index',
                unique: false,
                fields: ['property_new_value']
            },
            {
                name: 'property_old_value',
                unique: false,
                fields: ['property_old_value']
            },
            {
                name: 'user_id_index',
                unique: false,
                fields: ['user_id']
            }
            ,
            {
                name: 'property_name_index',
                unique: false,
                fields: ['property_name']
            }
        ]
    };
}
