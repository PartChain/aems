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
 * Asset model
 * @param sequelize
 * @param DataTypes
 * @constructor
 */
export default function AssetModel(sequelize: any, DataTypes: any) {
    return sequelize.define('asset', getAssetModelDefinition(DataTypes), getAssetModelIndices());
};

export function getAssetModelDefinition(DataTypes: any){
    return {
        serial_number_customer: {
            type: DataTypes.TEXT,
            primaryKey: true
        },
        serial_number_manufacturer: {
            type: DataTypes.TEXT
        },
        serial_number_type: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        manufacturer: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        manufacturer_plant: {
            type: DataTypes.TEXT
        },
        manufacturer_line: {
            type: DataTypes.TEXT
        },
        part_name_manufacturer: {
            type: DataTypes.TEXT,
        },
        part_number_customer: {
            type: DataTypes.TEXT,
        },
        part_number_manufacturer: {
            type: DataTypes.TEXT
        },
        production_country_code_manufacturer: {
            type: DataTypes.TEXT,
        },
        production_date_gmt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        quality_documents: {
            type: DataTypes.JSONB,
        },
        quality_status: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        status: {
            type: DataTypes.TEXT
        },
        custom_fields: {
            type: DataTypes.JSONB
        },
        mspid: {
            type: DataTypes.TEXT
        }
    }
}

export function getAssetModelIndices(){
    return {
        tableName: 'assets',
        indexes: [
            {
                name: 'manufacturer_index',
                unique: false,
                fields: ['manufacturer']
            },
            {
                name: 'quality_status_index',
                unique: false,
                fields: ['quality_status']
            },
            {
                name: 'production_date_gmt_index',
                unique: false,
                fields: ['production_date_gmt']
            },
            {
                name: 'production_country_code_manufacturer_index',
                unique: false,
                fields: ['production_country_code_manufacturer']
            },
            {
                name: 'part_name_manufacturer_index',
                unique: false,
                fields: ['part_name_manufacturer']
            },
            {
                name: 'serial_number_customer_index',
                unique: false,
                fields: ['serial_number_customer']
            },
            {
                name: 'mspid_index',
                unique: false,
                fields: ['mspid']
            }
        ]
    }
}
