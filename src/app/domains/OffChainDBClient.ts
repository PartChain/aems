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

import SQLClient from '../modules/sql-client/SQLClient';
import Objects from '../modules/mapper/Objects';
import Strings from '../modules/mapper/Strings';
import Logger from "../modules/logger/Logger";
import AssetModel, {getAssetModelDefinition} from "../models/Asset";
import RelationshipModel from "../models/Relationship";
import InvestigationModel from "../models/Investigation";
import InvestigationRelationshipModel from "../models/InvestigationRelationship";
import env from "../defaults";
import RichQuerySQL from "../modules/rich-query-sql/RichQuerySQL";
import Iterable from "../modules/iterable/Iterable";
import TransactionClient from "./TransactionClient";
import Transaction from "../interfaces/Transaction";
import {Asset} from "../modules/asset-validator/AssetValidator";
import {RelationshipStatusType} from "../enums/RelationshipStatusType";
import _ = require("lodash");
import {Sequelize} from "sequelize";



/**
 * OffChainDBClient
 * @class OffChainDBClient
 * @extends SQLClient
 */
export default class OffChainDBClient extends SQLClient {

    /**
     * Establishes a new connection pool to the database if the pool does not yet exist. Also creates a new database
     * and the according tables if they do not exist (based on the JWT mspID)
     * @param mspID
     */
    async connectAndSync(mspID: string): Promise<{ pool: Sequelize; assetModel: any; relationshipModel: any; investigationModel: any; investigationRelationshipModel: any; }> {
        const connectionPool = await super.connectAndSync(mspID);
        const assetModel = await this.initModel(AssetModel, connectionPool);
        await assetModel.sync();
        const relationshipModel = await this.initModel(RelationshipModel, connectionPool);
        await relationshipModel.sync();
        const investigationModel = await this.initModel(InvestigationModel, connectionPool);
        await investigationModel.sync();
        const investigationRelationshipModel = await this.initModel(InvestigationRelationshipModel, connectionPool);
        await investigationRelationshipModel.sync();
        return {
            pool: connectionPool,
            assetModel: assetModel,
            relationshipModel: relationshipModel,
            investigationModel: investigationModel,
            investigationRelationshipModel: investigationRelationshipModel
        };
    }

    /**
     * Get single Part with or without children
     * @async
     * @param serialNumberCustomers
     * @param maxChildLevel
     * @param mspIDFromJWT
     */
    async getAssetDetail(serialNumberCustomers: string | Array<string>, maxChildLevel: number = Number(env.childrenMaxRecursiveLimits.list), mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] GetAssetDetail in OffChainDBClient with serialNumberCustomers ${serialNumberCustomers}`);

        serialNumberCustomers = Iterable.create(serialNumberCustomers);

        const connectionPool = await this.connectAndSync(mspIDFromJWT);

        const serialNumberList = serialNumberCustomers;
        let queryString;

        // If we do not need children, we can do simple query.
        if (!maxChildLevel) {
            const whereConditionString = `IN (:serialNumberList)`;
            queryString = `SELECT a.*,  COALESCE(jsonb_agg(r.child_serial_number_customer) FILTER ( WHERE NOT (r.child_serial_number_customer = 'null')), '[]')  as components_serial_numbers
                                FROM Assets a
                                LEFT JOIN relationships r ON a.serial_number_customer = r.parent_serial_number_customer
                                WHERE serial_number_customer ${whereConditionString}
                                GROUP BY a.serial_number_customer;`;

        } else {
            const whereConditionString = `WHERE serial_number_customer IN (:serialNumberList)`;
            // Create Query
            queryString = await this.buildTreeQuery(whereConditionString, maxChildLevel);
        }

        Logger.debug(`Executing query: ${queryString}`);
        return connectionPool.pool.query(queryString, this.createRawQueryOptionsWithReplacement({serialNumberList: serialNumberList})).then(
            async (response: any) => {
                if (Array.isArray(response) && response.length == 0) {
                    return {};
                } else {
                    response = Objects.mapNestedKeys(response[0], Strings.snakeCaseToCamelCase);

                    if (response.hasOwnProperty("resultLength")) {
                        delete response.resultLength;
                    }
                    if (response.hasOwnProperty("lvl")) {
                        delete response.lvl;
                    }
                    if (response.hasOwnProperty("createdat")) {
                        delete response.createdat;
                    }
                    if (response.hasOwnProperty("updatedat")) {
                        delete response.updatedat;
                    }
                    return response;
                }

            })

    }

    /**
     * getAssetParent
     * @async
     * @param serialNumberCustomers
     * @param mspIDFromJWT
     * @param fields
     */
    async getAssetParent(serialNumberCustomers: string | Array<string>, mspIDFromJWT: string,
                         fields: any = RichQuerySQL.defaultFields.map(((field: any) => Strings.camelCaseToSnakeCase(field)))) {
        Logger.info(`[${mspIDFromJWT}] getAssetParent in OffChainDBClient`);
        const connectionPool = await this.connectAndSync(mspIDFromJWT);

        const serialNumberList = Iterable.create(serialNumberCustomers);

        fields = await this.cleanFields(fields);
        const index = fields.indexOf("components_serial_numbers", 0);
        let fieldsRightOuterJoin = fields;
        // This is needed since components_serial_numbers is built in the RightOuterJoin, thus cannot be referenced again
        if (index > -1) {
            fieldsRightOuterJoin.splice(index, 1);
        }
        const whereConditionString = `IN (:serialNumberList)`;
        const queryString = `SELECT    ${fields ? `${fields.join(", ")}` : "*"}, components_serial_numbers, parents
                                FROM (
                                         SELECT a.*,
                                                COALESCE(jsonb_agg(r.child_serial_number_customer)
                                                         FILTER ( WHERE NOT (r.child_serial_number_customer = 'null')), ' []
                                                                            ') as components_serial_numbers  --Aggregate children into one column
                             
                                         FROM Assets a
                                                  LEFT JOIN relationships r ON a.serial_number_customer = r.parent_serial_number_customer
                                         WHERE a.serial_number_customer ${whereConditionString}
                                         GROUP BY a.serial_number_customer
                                      ) Assets --Child asset joined with relationship table to get its components_serial_numbers
                                LEFT OUTER JOIN
                                    (
                                         SELECT relationships.child_serial_number_customer, to_jsonb(Assets) parents
                                         FROM (SELECT * from relationships where child_serial_number_customer = (SELECT serial_number_customer from assets where serial_number_customer ${whereConditionString})) Relationships --Only get the relevant relationship 
                                                  LEFT OUTER JOIN (SELECT  ${fieldsRightOuterJoin ? `${fieldsRightOuterJoin.join(", ")}` : "*"} from Assets) Assets 
                                                  ON Relationships.parent_serial_number_customer = Assets.serial_number_customer
                                     ) parents
                                ON parents.child_serial_number_customer = assets.serial_number_customer  --Join tables to get the child and its parent s
                                WHERE serial_number_customer ${whereConditionString};`;
        Logger.debug(`Executing query: ${queryString}`);
        return connectionPool.pool.query(queryString, this.createRawQueryOptionsWithReplacement({serialNumberList: serialNumberList})).then(
            async (response: any) => {
                if (response.length > 0) {
                    response = Objects.mapNestedKeys(response, Strings.snakeCaseToCamelCase);
                    const response_merged = Object.assign({}, response[0]);
                    if (response_merged.hasOwnProperty("resultLength")) {
                        delete response_merged.resultLength;
                    }
                    // merge all parents into one object
                    response_merged["parents"] = response.map((asset: any) => asset.parents);
                    response_merged["parents"] = _.compact(response_merged["parents"]);

                    return response_merged;
                }
                return response;

            }
        );
    }

    /**
     *
     * @param asset: single asset
     * @param mspIDFromJWT
     * @param assetMspID
     * @param relationshipExtras
     */
    async upsertAsset(asset: Asset, mspIDFromJWT: string, assetMspID: string, relationshipExtras: any = Object.create({})) {

        const connectionPool = await this.connectAndSync(mspIDFromJWT);
        const response = await connectionPool.assetModel.findOne({
            where: {
                "serial_number_customer": asset.serialNumberCustomer
            }
        });

        if (response) {
            Logger.info(`[${mspIDFromJWT}] Asset ${asset.serialNumberCustomer} already exists in PostgreSQL, therefore we will update it`);
            return this.updateAsset(asset, mspIDFromJWT, relationshipExtras, true);
        } else {
            Logger.info(`[${mspIDFromJWT}] Asset ${asset.serialNumberCustomer} is not in PostgreSQL, therefore we will store it`);
            return this.storeAssets(Iterable.create(asset), mspIDFromJWT, assetMspID, relationshipExtras);
        }
    }


    /**
     * Store a new part in SQL Database
     * @param assets
     * @param mspIDFromJWT
     * @param mspID of the part owner
     * @param relationshipExtras: If we have any extra information about a relation of this asset
     */
    async storeAssets(assets: any[], mspIDFromJWT: string, mspID: string, relationshipExtras: any = Object.create({})) {
        Logger.info(`[${mspIDFromJWT}] storeAssets in OffChainDBClient with ${assets.length} assets: ${JSON.stringify(assets)}`);
        const connectionPool = await this.connectAndSync(mspIDFromJWT);

        assets = assets.map(
            (tx: any) => Objects.mapKeys(tx, Strings.camelCaseToSnakeCase)
        );

        const relationships = [];
        // First create relationships array
        for (let i in assets) {
            if (assets[i].hasOwnProperty('serial_number_customer') && assets[i].hasOwnProperty('components_serial_numbers') && assets[i]["components_serial_numbers"] != null) {
                for (let child of assets[i]["components_serial_numbers"]) {
                    if (child != null) {
                        relationships.push({
                            "parent_serial_number_customer": assets[i]["serial_number_customer"],
                            "child_serial_number_customer": child,
                            "parent_mspid": mspID,
                            "child_mspid": relationshipExtras.hasOwnProperty(child) && relationshipExtras[child].hasOwnProperty("child_mspid") ? relationshipExtras[child]["child_mspid"] : "",
                            "transfer_status": relationshipExtras.hasOwnProperty(child) && relationshipExtras[child].hasOwnProperty("transfer_status") ? relationshipExtras[child]["transfer_status"] : 0,
                            "retries": 0,  // retries is 0 when we first store the part
                            "last_retry": new Date().toString()
                        })
                    }

                }
                delete assets[i]["components_serial_numbers"];

                assets[i]["mspid"] = mspID;

                for (let key in assets[i]) {
                    assets[i][key] = (assets[i][key] === null) ? "" : assets[i][key];
                }
            }

        }

        await connectionPool.assetModel.bulkCreate(assets);
        await connectionPool.relationshipModel.bulkCreate(relationships);

    }


    /**
     * Updates asset and its relationships in PostgreSQL based on the provided partUpdated
     * @param assetsUpdated
     * @param mspIDFromJWT
     * @param relationshipExtras: If we have any extra information about a relation of these assets
     * @param createTransactionRecord: true or false whether a transaction record should be created in the postgres tables, needed for asset that are not updated by the transactlionClient (e.g. asset by other mspIDs)
     */
    async updateAsset(assetsUpdated: any, mspIDFromJWT: string, relationshipExtras: any = Object.create({}), createTransactionRecord: boolean = false) {
        Logger.info(`[${mspIDFromJWT}] updateAssets in OffChainDBClient with ${JSON.stringify(assetsUpdated)}`);

        const connectionPool = await this.connectAndSync(mspIDFromJWT);
        assetsUpdated = Iterable.create(assetsUpdated);

        for (let partUpdated of assetsUpdated) {

            const transactions: Array<any> = [];
            partUpdated = Objects.mapKeys(partUpdated, Strings.camelCaseToSnakeCase);
            const assetToUpdate = await connectionPool.assetModel.findOne({where: {"serial_number_customer": partUpdated.serial_number_customer}});

            if (assetToUpdate) {
                Logger.debug(`[${mspIDFromJWT}] partUpdated: ${JSON.stringify(partUpdated)}`);
                Logger.debug(`[${mspIDFromJWT}] assetToUpdate: ${JSON.stringify(assetToUpdate)}`);
                // Update document
                // first find getObjectDifference to see what we need to update
                const keysToOmit = _.difference(Object.keys(partUpdated), Object.keys(await getAssetModelDefinition(AssetModel)));
                Logger.debug(`Key to omit: ${keysToOmit.toString()}`);
                const diff: any = _.fromPairs(_.differenceWith(_.toPairs(_.omit(partUpdated, keysToOmit)), _.toPairs(assetToUpdate.get({plain: true})), _.isEqual));

                if (diff.hasOwnProperty("production_date_gmt") && new Date(diff.production_date_gmt).getTime() === new Date(partUpdated.production_date_gmt).getTime()) {
                    // Date in fabric can be 2020-11-25T10:39:33.000Z while being 2020-11-25 10:39:33.000000 in postgres
                    delete diff.production_date_gmt;
                }
                Logger.info(`[${mspIDFromJWT}] Difference between Fabric asset and PostgreSQL asset: ${JSON.stringify(diff)}`);
                for (let key of Object.keys(diff)) {

                    if (createTransactionRecord) {
                        const tx: Transaction = Object.create({});
                        tx["userId"] = assetToUpdate.mspid; //TODO evaluate this: If asset got flagged by parent the user_id should be the parent mspID
                        tx["timestampCreated"] = new Date().getTime().toString();
                        tx["timestampChanged"] = new Date().getTime().toString();
                        tx["status"] = "STORED";
                        tx["serialNumberCustomer"] = assetToUpdate.serial_number_customer;
                        tx["propertyName"] = Strings.snakeCaseToCamelCase(key);
                        tx["propertyNewValue"] = (partUpdated[key] == null) ? partUpdated[key] : partUpdated[key].toString();
                        tx["propertyOldValue"] = (assetToUpdate[key] == null) ? assetToUpdate[key] : assetToUpdate[key].toString();
                        transactions.push(tx);
                    }

                    assetToUpdate[key] = partUpdated[key];
                }
                await assetToUpdate.save()
                if (transactions.length > 0) {
                    const transactionClient = new TransactionClient;
                    transactions.forEach(
                        async (tx) => {
                            await transactionClient.createTransaction(tx, mspIDFromJWT);
                        });

                }

                // Get all edges, to check if any edges had changed
                const relationshipRows: any = await this.getRelationshipsByParent(partUpdated.serial_number_customer, mspIDFromJWT);
                const componentsSerialNumbersInDB = relationshipRows.map((a: any) => a.child_serial_number_customer);

                // Get getObjectDifference between db and assetToUpdate
                const notInAsset = _.difference(componentsSerialNumbersInDB, partUpdated['components_serial_numbers']);
                const notInDB = _.difference(partUpdated['components_serial_numbers'], componentsSerialNumbersInDB);

                Logger.info(`[${mspIDFromJWT}] Relationship not in Asset: ${notInAsset}`);
                Logger.info(`[${mspIDFromJWT}] Relationship not in PostgreSQL version of Asset: ${notInDB}`);


                for (const value of notInDB) {
                    if (typeof value === "string") {
                        await this.addRelationship(mspIDFromJWT, partUpdated.serial_number_customer, value, assetToUpdate["mspid"],
                            relationshipExtras.hasOwnProperty(value) && relationshipExtras[value].hasOwnProperty("child_mspid") ? relationshipExtras[value]["child_mspid"] : "",
                            relationshipExtras.hasOwnProperty(value) && relationshipExtras[value].hasOwnProperty("transfer_status") ? relationshipExtras[value]["transfer_status"] : 0);
                    }
                }
            } else {
                Logger.error(`[${mspIDFromJWT}] updateAsset in SQL failed, since part ${partUpdated.serial_number_customer} does not exist`);
            }
        }

    }


    /**
     *
     * @param mspIDFromJWT
     * @param parentSerialNumberCustomer
     * @param childSerialNumberCustomer
     * @param parentMSPID
     * @param childMSPID
     * @param transferStatus
     * @param retries
     * @param lastRetry
     */
    async addRelationship(mspIDFromJWT: string, parentSerialNumberCustomer: string, childSerialNumberCustomer: string,
                          parentMSPID: string = "", childMSPID: string = "", transferStatus: number = 0,
                          retries: number = 0, lastRetry: Date = new Date()) {
        const connectionPool = await this.connectAndSync(mspIDFromJWT);

        await connectionPool.relationshipModel.create({
            "parent_serial_number_customer": parentSerialNumberCustomer,
            "child_serial_number_customer": childSerialNumberCustomer,
            "parent_mspid": parentMSPID,
            "child_mspid": childMSPID,
            "transfer_status": transferStatus,
            "retries": retries, // retries is 0 when we first add the part
            "last_retry": lastRetry.toString()

        });

    }


    /**
     *
     * @param parentSerialNumberCustomer
     * @param childSerialNumberCustomer
     * @param mspIDFromJWT
     */
    async deleteRelationship(parentSerialNumberCustomer: string, childSerialNumberCustomer: string, mspIDFromJWT: string) {
        const connectionPool = await this.connectAndSync(mspIDFromJWT);

        const relationship = await connectionPool.relationshipModel.findOne({
            where: {
                "parent_serial_number_customer": parentSerialNumberCustomer,
                "child_serial_number_customer": childSerialNumberCustomer
            }
        });
        Logger.info(`[${mspIDFromJWT}] Deleting relationship ${relationship}`);
        if (relationship) {
            await relationship.destroy();
        }

    }

    /**
     *
     * @param serialNumberCustomers
     * @param mspIDFromJWT
     */
    async translateSerialNumberCustomerToManufacturer(serialNumberCustomers: any, mspIDFromJWT: string) {
        Logger.debug(`[${mspIDFromJWT}]  In translateSerialNumberCustomerToManufacturer now `);
        await this.connectAndSync(mspIDFromJWT);

        let response = await this.getAssetDetail(serialNumberCustomers, 0, mspIDFromJWT);
        response = Iterable.create(response);
        response = response.map((asset: any) => asset.serialNumberManufacturer);
        return response;

    }

    /** Returns true if relationship is available
     * @param parentSerialNumberCustomer
     * @param childSerialNumberCustomer
     * @param mspIDFromJWT
     */
    async isRelationshipAvailable(parentSerialNumberCustomer: string, childSerialNumberCustomer: string, mspIDFromJWT: string) {
        Logger.debug(`[${mspIDFromJWT}] isRelationshipAvailable in OffChainDBClient`);
        const connectionPool = await this.connectAndSync(mspIDFromJWT);

        const relationship = await connectionPool.relationshipModel.findOne({
            where: {
                "child_serial_number_customer": childSerialNumberCustomer
            }
        });
        // If relationship does not exist we do not care about if it is a batch or not
        if (relationship === null) {
            return true;
        }
        //If relationship exists we need to check the serial_number_type
        else {
            const childAsset = await connectionPool.assetModel.findOne({
                where: {
                    "serial_number_customer": childSerialNumberCustomer
                }
            });
            if (childAsset !== null && (childAsset.serial_number_type).toLowerCase() !== "single") {
                // If child is not of type SINGLE we do not care
                return true;
            } else if (childAsset == null) {
                // in case we don`t have the child yet we cannot know if it batch or single
                return true;
            } else {
                // In this case the serialNumberType is SINGLE, so we have to check whether the requested relation is equal to the already stored relation, since a child cannot have multiple parents in the single case
                return relationship.parent_serial_number_customer === parentSerialNumberCustomer;
            }
        }

    }


    /**
     * This function builds a SQL query which builds up a hierachy from parents -> children recursively for all levels.
     * It is inspired by https://schinckel.net/2017/07/01/tree-data-as-a-nested-list-redux/ , but customized for our needs.
     * @param whereConditionStringParent
     * @param fields
     * @param maxChildLevel
     * @param pagination
     */
    async buildTreeQuery(whereConditionStringParent: string, maxChildLevel: number = 0, pagination: number = 0,
                         fields: any = RichQuerySQL.defaultFields.map(((field: any) => Strings.camelCaseToSnakeCase(field)))) {

        //let atLeastOneNOKString = atLeastOneNOK ? "AND EXISTS (SELECT * FROM c_tree x WHERE c_tree.serial_number_customer = x.parent AND x.qualityStatus = 'NOK')" : "";

        pagination = Number(pagination);
        fields = await this.cleanFields(fields);

        let paginationString = (pagination > 0) ? `OFFSET ${(pagination - 1) * env.paginationLimit} LIMIT ${env.paginationLimit}` : "";
        // let minimumNumberChildrenString = minimumNumberChildren ?  `and JSONB_ARRAY_LENGTH(js->'Children') > ${minimumNumberChildren};` : `;`;

        return `WITH RECURSIVE 
                 filtered_set AS (  SELECT * ${(pagination > 0) ? ", count(*) over() as result_length" : ""}
                                    FROM assets
                                    ${whereConditionStringParent}
                                    ORDER BY production_Date_Gmt DESC
                                    ${paginationString}),
                location_with_level AS ((
                SELECT ${fields ? `t1.${fields.join(", t1.")}` : "t1.*"}, t1.parent_Serial_Number_Customer,
                       0 AS lvl ${(pagination > 0) ? ",t1.result_length" : ""} 
                FROM (
                        select *
                        from  (SELECT * from relationships where exists(SELECT 1 from filtered_set AS fs where fs.serial_number_customer = parent_serial_number_customer)) Relationships
                        RIGHT OUTER JOIN ( 
                             
                             SELECT a.*,(SELECT COALESCE(jsonb_agg(r.child_serial_number_customer) FILTER ( WHERE NOT (r.child_serial_number_customer = 'null')), '[]') FROM Assets assets_duplicate
                                                    LEFT JOIN relationships r ON assets_duplicate.serial_number_customer = r.parent_serial_number_customer
                                                     WHERE a.serial_number_customer = assets_duplicate.serial_number_customer
                                                    GROUP BY assets_duplicate.serial_number_customer)  as components_serial_numbers
                            FROM filtered_set a
                            ) Assets ON Relationships.child_Serial_Number_Customer=Assets.serial_Number_Customer
                       ) as t1  where t1.parent_serial_number_customer is NULL)

                UNION ALL
            
                SELECT ${fields ? `child.${fields.join(", child.")}` : "child.*"}, child.parent_Serial_Number_customer,
                       parent.lvl + 1 ${(pagination > 0) ? ", 0 as result_length" : ""}
                FROM (
                        select *
                        from  Relationships
                        RIGHT OUTER JOIN (
                                       SELECT a.*,
                                                (SELECT COALESCE(jsonb_agg(r.child_serial_number_customer)
                                                                 FILTER ( WHERE NOT (r.child_serial_number_customer = 'null')),
                                                                 '[]') 
                                                 FROM Assets assets_duplicate
                                                          LEFT JOIN relationships r
                                                                    ON assets_duplicate.serial_number_customer = r.parent_serial_number_customer
                                                 WHERE a.serial_number_customer = assets_duplicate.serial_number_customer
                                                 GROUP BY assets_duplicate.serial_number_customer) as components_serial_numbers
                                         FROM (
                                                  SELECT * 
                                                  from assets
                                              ) a ) Assets
                                        ON Relationships.child_Serial_Number_Customer=Assets.serial_Number_Customer
                                    ) as child
                         JOIN location_with_level parent ON parent.serial_Number_customer = child.parent_Serial_Number_customer
                ),
                maxlvl AS ( SELECT max(lvl) maxlvl FROM (SELECT * from location_with_level where lvl <= ${maxChildLevel}) maxlvltable),
                location_with_lvl_restricted AS (SELECT * from location_with_level where lvl <= ${maxChildLevel}), 
                c_tree AS (
                   SELECT location_with_lvl_restricted.*, '[]'::jsonb child_components
                   FROM location_with_lvl_restricted, maxlvl
                   WHERE location_with_lvl_restricted.lvl = maxlvl
                
                   UNION
                
                   (
                       SELECT (branch_parent).*, coalesce(jsonb_agg(branch_child) FILTER ( WHERE NOT (branch_child = 'null')), '[]'::jsonb)
                       FROM (
                                SELECT branch_parent,
                                       to_jsonb(branch_child) - 'lvl' - 'parent' - 'result_length' AS branch_child
                                FROM location_with_lvl_restricted branch_parent
                                         JOIN c_tree branch_child ON branch_child.parent_Serial_Number_customer = branch_parent.serial_Number_customer
                            ) branch
                       GROUP BY branch.branch_parent
                
                       UNION
                
                       SELECT c.*,
                              '[]'::jsonb
                       FROM location_with_lvl_restricted c
                       WHERE NOT EXISTS (SELECT 1
                                         FROM location_with_lvl_restricted hypothetical_child
                                         WHERE hypothetical_child.parent_Serial_Number_customer = c.serial_Number_customer)
                   )
                )
                SELECT * FROM (
                                SELECT *
                                FROM c_tree
                                UNION 
                                SELECT *, '[]'::jsonb
                                FROM location_with_level
                                WHERE lvl >= ${maxChildLevel}
                              ) final_set  WHERE EXISTS(SELECT 1 FROM filtered_set AS fs WHERE fs.serial_number_customer = final_set.serial_number_customer);`

    }

    /**
     * Removes keys from object which are not found in the assetModel definition
     * @param filter
     */
    async cleanFilter(filter: any) {
        Logger.debug("In cleanFilter now");
        // Remove all keys where are not fit to the model
        const assetColumns = await getAssetModelDefinition(AssetModel);
        for (let key in filter.selector) {
            if (!assetColumns.hasOwnProperty(key) && key != "components_serial_numbers" && key != "child_components" && key != "part_name_number") {
                Logger.info(`Deleting key ${key}`);
                delete filter.selector[key];
            }

        }
        filter.fields = await this.cleanFields(filter.fields);
        return filter;
    }

    /**
     * Removes Fields which are not in Asset Definition
     * @param fields
     */
    async cleanFields(fields: any) {
        Logger.debug("In cleanFields now");
        // Remove all keys where are not fit to the model
        const assetColumns = await getAssetModelDefinition(AssetModel);
        for (let key of fields) {
            // components_serial_numbers is not in the AssetModelDefinition, but we want it either way
            if (!assetColumns.hasOwnProperty(key) && key != "components_serial_numbers") {
                Logger.info(`Deleting field ${key}`);
                let index = fields.indexOf(key);
                if (index !== -1) fields.splice(index, 1);
            }
        }
        return fields;
    }

    /**
     * Uses the filter generated by RichQuerySQL to build an WHERE clause
     * @param filter
     */
    async buildWhereCondition(filter: any) {
        Logger.debug(`In buildWhereCondition with filter ${JSON.stringify(filter)}`);

        let replacements = Object.create({});
        let whereConditionString = "";
        for (let key in filter.selector) {
            if (filter.selector.hasOwnProperty(key)) {
                if (!whereConditionString) {
                    // omit key if key == partNameNumber, since the structure of partNameNumber value. See getPartNameNumberSelector function for details
                    whereConditionString = `WHERE ${(key === 'part_name_number') ? "" : key} ${filter.selector[key].whereClause}`;
                    replacements = {...replacements, ...filter.selector[key].replacement};
                } else {
                    whereConditionString = whereConditionString + ` AND ${(key === 'part_name_number') ? "" : key} ${filter.selector[key].whereClause}`;
                    replacements = {...replacements, ...filter.selector[key].replacement};

                }
            }

        }
        Logger.debug(JSON.stringify({"whereConditionString": whereConditionString, "replacements": replacements}));
        return {"whereConditionString": whereConditionString, "replacements": replacements};
    }

    /**
     * Return all relationships by a specific or multiple transfer status
     *
     * @param transferStatus
     * @param mspIDFromJWT
     * @param limit
     * @param orderRandom: Boolean whether you want to get the relationships in a random order
     */
    async getRelationshipsByTransferStatus(transferStatus: number | Array<number>, mspIDFromJWT: string, limit: number = 100, orderRandom: boolean = false) {
        Logger.debug(`[${mspIDFromJWT}] getAssetByTransferStatus in OffChainDBClient with status ${transferStatus}, limit ${limit} and orderRandom ${orderRandom}`);

        const connectionPool = await this.connectAndSync(mspIDFromJWT);

        const filter = {
            "selector": {
                "transfer_status": {
                    "whereClause": " IN (:transfer_status) ",
                    "replacement": {
                        "transfer_status": Iterable.create(transferStatus)
                    }
                }
            }
        };
        const whereCondition = await this.buildWhereCondition(filter);
        const queryString = `SELECT * FROM relationships ${whereCondition.whereConditionString} ${orderRandom ? "ORDER BY random()" : ""} LIMIT ${limit}`;
        Logger.debug(`[${mspIDFromJWT}] Executing query: ${queryString}`);
        return connectionPool.pool.query(queryString, this.createRawQueryOptionsWithReplacement(whereCondition.replacements));

    }



    /**
     * Return all relationships in status NotInFabric with a sophisticated logic: New relationships we will get queried more often than older relationships.
     * For every query the result will consist of 3 parts: new, medium old and old relationships. New relationships will be queried more often then old ones.
     *
     * @param mspIDFromJWT
     * @param limit
     */
    async getRelationshipsNotInFabric(mspIDFromJWT: string, limit: number = 100) {
        Logger.debug(`[${mspIDFromJWT}] getRelationshipsNotInFabric in OffChainDBClient with status limit ${limit}`);

        let desiredCountNewRelationships = Math.ceil(limit * env.cronjob.status.notInFabric.newRelationships.limitPercentage);
        let desiredCountMediumRelationships = Math.ceil(limit * env.cronjob.status.notInFabric.mediumRelationships.limitPercentage);
        let desiredCountOldRelationships = Math.ceil(limit * env.cronjob.status.notInFabric.oldRelationships.limitPercentage);

        const connectionPool = await this.connectAndSync(mspIDFromJWT);

        const filter = {
            "selector": {
                "transfer_status": {
                    "whereClause": " IN (:transfer_status) ",
                    "replacement": {
                        "transfer_status": Iterable.create(RelationshipStatusType.notInFabric)
                    }
                },
                "retries": {
                    "whereClause": " >= :min_retries AND retries < :max_retries ",
                    "replacement": {
                        "max_retries": env.cronjob.status.notInFabric.newRelationships.maxRetries,
                        "min_retries": env.cronjob.status.notInFabric.newRelationships.minRetries
                    }
                },
                "last_retry": {
                    "whereClause": " < NOW() - INTERVAL ':days days' ",
                    "replacement": {
                        "days": env.cronjob.status.notInFabric.newRelationships.retryPeriodInDays
                    }
                }
            }
        };


        let whereCondition = await this.buildWhereCondition(filter);
        let queryString = `SELECT * FROM relationships ${whereCondition.whereConditionString} ORDER BY "updatedAt" LIMIT ${desiredCountNewRelationships}`;
        Logger.debug(`[${mspIDFromJWT}] Executing query for newestRelationshipsNotInFabric: ${queryString}`);
        const newRelationshipsNotInFabric = await connectionPool.pool.query(queryString, this.createRawQueryOptionsWithReplacement(whereCondition.replacements));

        // In case the length of newRelationshipsNotInFabric is less then our desired count we add this contingent to desiredCountMediumRelationships
        desiredCountMediumRelationships += desiredCountNewRelationships - newRelationshipsNotInFabric.length;
        filter.selector.last_retry.replacement.days = env.cronjob.status.notInFabric.mediumRelationships.retryPeriodInDays;
        filter.selector.retries.replacement.min_retries = env.cronjob.status.notInFabric.mediumRelationships.minRetries;
        filter.selector.retries.replacement.max_retries = env.cronjob.status.notInFabric.mediumRelationships.maxRetries;
        whereCondition = await this.buildWhereCondition(filter);
        queryString = `SELECT * FROM relationships ${whereCondition.whereConditionString} ORDER BY "updatedAt" LIMIT ${desiredCountMediumRelationships}`;
        Logger.debug(`[${mspIDFromJWT}] Executing query for mediumRelationshipsNotInFabric: ${queryString}`);
        const mediumRelationshipsNotInFabric = await connectionPool.pool.query(queryString, this.createRawQueryOptionsWithReplacement(whereCondition.replacements));


        // In case the length of mediumRelationshipsNotInFabric is less then our desired count we add this contingent to desiredCountOldRelationships
        desiredCountOldRelationships += desiredCountMediumRelationships - mediumRelationshipsNotInFabric.length;
        filter.selector.last_retry.replacement.days = env.cronjob.status.notInFabric.oldRelationships.retryPeriodInDays;
        filter.selector.retries.whereClause = " >= :min_retries "
        filter.selector.retries.replacement.min_retries = env.cronjob.status.notInFabric.oldRelationships.minRetries;
        delete filter.selector.retries.replacement.max_retries;
        whereCondition = await this.buildWhereCondition(filter);
        queryString = `SELECT * FROM relationships ${whereCondition.whereConditionString} ORDER BY "updatedAt" LIMIT ${desiredCountOldRelationships}`;
        Logger.debug(`[${mspIDFromJWT}] Executing query for oldRelationshipsNotInFabric: ${queryString}`);
        const oldRelationshipsNotInFabric = await connectionPool.pool.query(queryString, this.createRawQueryOptionsWithReplacement(whereCondition.replacements));

        Logger.info(`[${mspIDFromJWT}] Got ${newRelationshipsNotInFabric.length} newRelationshipsNotInFabric (desiredCount ${desiredCountNewRelationships}), ${mediumRelationshipsNotInFabric.length} mediumRelationshipsNotInFabric (desiredCount ${desiredCountMediumRelationships}) and ${oldRelationshipsNotInFabric.length} oldRelationshipsNotInFabric (desiredCount ${desiredCountOldRelationships})`);

        return [...newRelationshipsNotInFabric, ...mediumRelationshipsNotInFabric, ...oldRelationshipsNotInFabric];

    }

    /**
     * Return all relationships by a specific (or multiple) transfer status for a specific MSP
     *
     * @param transferStatus
     * @param mspID
     * @param mspIDFromJWT
     */
    async getRelationshipsByTransferStatusAndMSP(transferStatus: number | Array<number>, mspID: string, mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] getRelationshipsByTransferStatusAndMSP in OffChainDBClient`);

        const connectionPool = await this.connectAndSync(mspIDFromJWT);

        const filter = {
            "selector": {
                "transfer_status": {
                    "whereClause": " IN (:transfer_status) ",
                    "replacement": {
                        "transfer_status": Iterable.create(transferStatus)
                    }
                },

                "parent_mspid": {
                    "whereClause": " = :parent_mspid ",
                    "replacement": {
                        "parent_mspid": mspID
                    }
                }
            }
        };
        const whereCondition = await this.buildWhereCondition(filter);
        const queryString = `SELECT * FROM relationships ${whereCondition.whereConditionString}`;
        Logger.debug(`[${mspIDFromJWT}] Executing query: ${queryString}`);
        return connectionPool.pool.query(queryString, this.createRawQueryOptionsWithReplacement(whereCondition.replacements));

    }


    /**
     * Return all relationships by a specific parent with status
     *
     * @param parentSerialNumberCustomer
     * @param transferStatus
     * @param mspIDFromJWT
     */
    async getRelationshipsByParentAndStatus(parentSerialNumberCustomer: string, transferStatus: number | Array<number>, mspIDFromJWT: string) {
        Logger.debug(`[${mspIDFromJWT}] getRelationshipsByParentAndStatus in OffChainDBClient with parentSerialNumberCustomer ${parentSerialNumberCustomer} and transferStatus ${transferStatus}`);

        const connectionPool = await this.connectAndSync(mspIDFromJWT);

        const filter = {
            "selector": {
                "transfer_status": {
                    "whereClause": " IN (:transfer_status) ",
                    "replacement": {
                        "transfer_status": Iterable.create(transferStatus)
                    }
                },
                "parent_serial_number_customer": {
                    "whereClause": " = :parent_serial_number_customer ",
                    "replacement": {
                        "parent_serial_number_customer": parentSerialNumberCustomer
                    }
                }
            }
        };
        const whereCondition = await this.buildWhereCondition(filter);
        const queryString = `SELECT * FROM relationships ${whereCondition.whereConditionString}`;
        Logger.debug(`[${mspIDFromJWT}] Executing query: ${queryString}`);
        return connectionPool.pool.query(queryString, this.createRawQueryOptionsWithReplacement(whereCondition.replacements));

    }

    /**
     * Add Asset To Investigation
     * @param mspIDFromJWT
     * @param investigationID
     * @param serialNumberCustomer
     * @param orgMSP
     * @param status
     * @param retries
     * @param lastRetry
     * @param retries
     * @param lastRetry
     */

    async addAssetToInvestigation(mspIDFromJWT: string, investigationID: string, serialNumberCustomer: string, orgMSP: string, status: number = 11,
                                  retries: number = 0, lastRetry: Date = new Date()) {
        Logger.info(`[${mspIDFromJWT}] addAssetToInvestigation `);
        const connectionPool = await this.connectAndSync(mspIDFromJWT);
        await connectionPool.investigationModel.create({
            "investigation_id": investigationID,
            "investigation_serial_number_customer": serialNumberCustomer,
            "org_mspid": orgMSP,
            "investigation_status": status,
            "retries": retries,
            "lastRetry": lastRetry.toString()
        });

    }


    /**
     * add Asset To Investigation Realtionship
     * @param mspIDFromJWT
     * @param investigationID
     * @param serialNumberCustomer
     * @param sharedWithOrg
     */

    async addAssetToInvestigationRealtionship(mspIDFromJWT: string, investigationID: string, serialNumberCustomer: string, sharedWithOrg: string) {
        Logger.info(`[${mspIDFromJWT}] addAssetToInvestigationRealtionship `);
        const connectionPool = await this.connectAndSync(mspIDFromJWT);
        await connectionPool.investigationRelationshipModel.create({
            "investigation_id": investigationID,
            "serial_number_customer": serialNumberCustomer,
            "shared_with_org": sharedWithOrg
        });

    }


    /**
     * get Relationship By  SerialNumberCustomer
     * @param serialNumberCustomer
     * @param mspIDFromJWT
     */

    async getRelationshipBySerialNumberCustomerForInvestigation(serialNumberCustomer: string, mspIDFromJWT: string) {
        Logger.debug(`[${mspIDFromJWT}] getRelationshipBySerialNumberCustomerForInvestigation withserialNumberCustomer = ${serialNumberCustomer}`);
        const connectionPool = await this.connectAndSync(mspIDFromJWT);

        const filter = {
            "selector": {
                "investigation_serial_number_customer": {
                    "whereClause": " = :investigation_serial_number_customer ",
                    "replacement": {
                        "investigation_serial_number_customer": serialNumberCustomer
                    }
                }
            }
        };
        const whereCondition = await this.buildWhereCondition(filter);
        const queryString = `SELECT * FROM investigations ${whereCondition.whereConditionString}`;
        Logger.debug(`[${mspIDFromJWT}] Executing query: ${queryString}`);
        return connectionPool.pool.query(queryString, this.createRawQueryOptionsWithReplacement(whereCondition.replacements));

    }

    /**
     * get relationship for shared serial number customer in investigation
     * @param serialNumberCustomer
     * @param mspIDFromJWT
     */


    async getRelationshipForSharedSNCInInvestigation(serialNumberCustomer: string, mspIDFromJWT: string) {
        Logger.debug(`[${mspIDFromJWT}] getRelationshipForSharedSNCInInvestigation withserialNumberCustomer = ${serialNumberCustomer}`);
        const connectionPool = await this.connectAndSync(mspIDFromJWT);

        const filter = {
            "selector": {
                "serial_number_customer": {
                    "whereClause": " = :serial_number_customer ",
                    "replacement": {
                        "serial_number_customer": serialNumberCustomer
                    }
                }
            }
        };
        const whereCondition = await this.buildWhereCondition(filter);
        const queryString = `SELECT * FROM investigation_relationships ${whereCondition.whereConditionString}`;
        Logger.debug(`[${mspIDFromJWT}] Executing query: ${queryString}`);
        return connectionPool.pool.query(queryString, this.createRawQueryOptionsWithReplacement(whereCondition.replacements));

    }


    /**
     * update Relationship Status For Investigation
     * @param investigationID
     * @param status
     * @param serialNumberCustomer
     * @param mspIDFromJWT
     * @param action
     */
    async updateRelationshipStatusForInvestigation(investigationID: string, serialNumberCustomer: string, status: number, mspIDFromJWT: string, action: string) {
        Logger.info(`[${mspIDFromJWT}] updateRelationshipStatusForInvestigation of ${investigationID} to status ${status}`);
        const connectionPool = await this.connectAndSync(mspIDFromJWT);
        const relationshipToUpdate = await connectionPool.investigationModel.findOne({
            where: {
                "investigation_serial_number_customer": serialNumberCustomer,
                "investigation_id": investigationID
            }
        });
        Logger.info(`[${mspIDFromJWT}] updateRelationshipStatusForInvestigation = ${JSON.stringify(relationshipToUpdate)}`);
        relationshipToUpdate.investigation_status = status;
        if (action === "retry") {
            relationshipToUpdate.investigation_retries = relationshipToUpdate.investigation_retries + 1;
        }
        relationshipToUpdate.investigation_last_retry = new Date().toString();
        await relationshipToUpdate.save();

    }


    /**
     * get Relationship By Status For Investigation
     * @param status
     * @param mspIDFromJWT
     */
    async getRelationshipByStatusForInvestigation(mspIDFromJWT: string, status: number) {
        Logger.debug(`[${mspIDFromJWT}] getRelationshipByStatusForInvestigation with status = ${status}`);
        const connectionPool = await this.connectAndSync(mspIDFromJWT);

        const filter = {
            "selector": {
                "investigation_status": {
                    "whereClause": " = :investigation_status",
                    "replacement": {
                        "investigation_status": status
                    }
                }
            }
        };
        const whereCondition = await this.buildWhereCondition(filter);
        const queryString = `SELECT * FROM investigations ${whereCondition.whereConditionString}`;
        Logger.debug(`[${mspIDFromJWT}] Executing query: ${queryString}`);
        return connectionPool.pool.query(queryString, this.createRawQueryOptionsWithReplacement(whereCondition.replacements));


    }


    /**
     * Return all relationships by a specific parent
     *
     * @param parentSerialNumberCustomer
     * @param mspIDFromJWT
     */
    async getRelationshipsByParent(parentSerialNumberCustomer: string, mspIDFromJWT: string) {
        Logger.debug(`[${mspIDFromJWT}] getRelationshipsByParent in OffChainDBClient with parentSerialNumberCustomer ${parentSerialNumberCustomer}`);

        const connectionPool = await this.connectAndSync(mspIDFromJWT);

        const filter = {
            "selector": {
                "parent_serial_number_customer": {
                    "whereClause": " = :parent_serial_number_customer ",
                    "replacement": {
                        "parent_serial_number_customer": parentSerialNumberCustomer
                    }
                }
            }
        };
        const whereCondition = await this.buildWhereCondition(filter);
        const queryString = `SELECT * FROM relationships ${whereCondition.whereConditionString}`;
        Logger.debug(`[${mspIDFromJWT}] Executing query: ${queryString}`);
        return connectionPool.pool.query(queryString, this.createRawQueryOptionsWithReplacement(whereCondition.replacements));

    }

    /**
     *
     *
     * @param childSerialNumberCustomer: relationship to update
     * @param transferStatus: new status
     * @param childMspID : mspID of the child component
     * @param mspIDFromJWT
     */
    async updateRelationshipStatusWithMspID(mspIDFromJWT: string, childSerialNumberCustomer: string, transferStatus: number = 0, childMspID: string = " ") {
        Logger.info(`[${mspIDFromJWT}] updateRelationshipStatusWithMspID of ${childSerialNumberCustomer} to status ${transferStatus} and mspID ${childMspID}`);

        const connectionPool = await this.connectAndSync(mspIDFromJWT);

        await connectionPool.relationshipModel.update({ retries: Sequelize.literal('retries + 1'),
                transfer_status: transferStatus,
                child_mspid: childMspID,
                last_retry: new Date().toString()},
            {where: {"child_serial_number_customer": childSerialNumberCustomer}});

    }

    /**
     *
     *
     * @param mspIDFromJWT
     * @param childSerialNumberCustomer: relationship to update
     * @param transferStatus: new status
     */
    async updateRelationshipStatus(mspIDFromJWT: string, childSerialNumberCustomer: string, transferStatus: number = 0) {
        Logger.info(`[${mspIDFromJWT}] updateRelationshipStatus of childSerialNumberCustomer ${childSerialNumberCustomer} to status ${transferStatus}`);

        const connectionPool = await this.connectAndSync(mspIDFromJWT);

        await connectionPool.relationshipModel.update({ retries: Sequelize.literal('retries + 1'),
                                                        transfer_status: transferStatus,
                                                        last_retry: new Date().toString()},
            {where: {"child_serial_number_customer": childSerialNumberCustomer}});
    }

    /**
     * @param mspIDFromJWT
     */
    async getLastBlock(mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] getLastBlock in OffChainDBClient`);
        const connectionPool = await this.connectAndSync(mspIDFromJWT);


        const queryString = `SELECT MAX(block)
                             FROM assets;`;
        Logger.info(`Executing query: ${queryString}`);
        return connectionPool.pool.query(queryString, this.createRawQueryOptionsWithReplacement(null));
    }


}