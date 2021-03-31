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

import SmartContractClient from "./SmartContractClient";
import Logger from "../modules/logger/Logger";
import Response from "../modules/response/Response";
import Iterable from "../modules/iterable/Iterable";
import * as customErrors from '../modules/error/CustomErrors'
import OffChainDBClient from "./OffChainDBClient";
import {RelationshipStatusType} from "../enums/RelationshipStatusType";
import _ = require("lodash");
import GatewaySingleton from "../modules/gateway/GatewaySingleton";

/**
 *
 */
export default class AccessMgmtClient extends SmartContractClient {


    /**
     *
     * @param mspIDFromJWT
     */
    async enrollOrg(mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] Called enrollOrg`);

        Logger.debug(`[${mspIDFromJWT}] Ready for transaction in enrollOrg`);
        return await Response.processResponse(
            await this.processTransaction('enrollOrg', mspIDFromJWT, [{"enrollOrg": "enrollOrg"}], 'submit'),
            true,
            mspIDFromJWT,
            true
        );
    }


    /**
     * enroll all orgs stored in keycloakCredentialsFilePath
     */
    async enrollAllOrgs() {
        Logger.info(`Called enrollAllOrgs`);

        const gatewaySingleton: GatewaySingleton = await GatewaySingleton.getInstance();
        const hlfIdentities = gatewaySingleton.getHLFIdentities();
        for (let identity of Object.keys(hlfIdentities)) {
            const mspIDFromJWT = hlfIdentities[identity]["HLF_IDENTITY_MSP_ID"];
            const result = await this.enrollOrg(mspIDFromJWT);
            switch (result.status) {
                case 400:
                    Logger.info(`[${mspIDFromJWT}] Org ${mspIDFromJWT} already enrolled`);
                    break
                case 500:
                    Logger.error(`[${mspIDFromJWT}] Error when enrolling org ${mspIDFromJWT}: ${JSON.stringify(result)}`);
                    break
            }

        };

    }

    /**
     *
     * @param mspIDFromJWT
     */
    async getAccessControlList(mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] Called listAccessControlList`);

        Logger.debug(`[${mspIDFromJWT}] Ready for transaction in listAccessControlList`);
        return await Response.processResponse(
            await this.processTransaction('getOrgDetails', mspIDFromJWT, [{"orgMSP": mspIDFromJWT}], 'eval'),
            false,
            mspIDFromJWT,
            true
        );

    }

    /**
     *
     * @param mspIDFromJWT
     */
    async getAccessRequests(mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] Called listAccessControlList`);

        Logger.debug(`[${mspIDFromJWT}] Ready for transaction in listAccessControlList`);
        const response = await Response.processResponse(
            await this.processTransaction('getOrgDetails', mspIDFromJWT, [{"orgMSP": mspIDFromJWT}], 'eval'),
            false,
            mspIDFromJWT,
            true
        );
        if (response.status === 200) {
            // only filter for items with status pending and where we are no the initiator

            Object.keys(response.data.ACL).forEach(function (key, index) {
                // key: the name of the object key
                // index: the ordinal position of the key within the object
                if (!(response.data.ACL[key].status === "PENDING" && response.data.ACL[key].changedBy !== mspIDFromJWT)) {
                    delete response.data.ACL[key];
                }
            });
        }
        return response;

    }

    /**
     * Returns recommendations for partner which we might want to request access from
     * @param mspIDFromJWT
     */
    async getAccessRequestRecommendations(mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] Called getAccessRecommendations`);

        Logger.debug(`[${mspIDFromJWT}] Ready for transaction in listAccessControlList`);
        const response = await Response.processResponse(
            await this.processTransaction('getOrgDetails', mspIDFromJWT, [{"orgMSP": mspIDFromJWT}], 'eval'),
            false,
            mspIDFromJWT,
            true
        );
        if (response.status === 200) {

            // Check which relationships are in status requestAssetNotAllowed and what are their mspIDs
            const offChainDBClient = new OffChainDBClient();
            const relationships = await offChainDBClient.getRelationshipsByTransferStatus(RelationshipStatusType.requestAssetNotAllowed, mspIDFromJWT);
            const uniqueMspIDs = [...new Set(relationships.map((rel: any) => rel.child_mspid))];

            const activeOrPendingMspIDs: any = [];

            // First Filter for active ACL items, then extract the relevant mspId from entities
            Object.keys(response["data"]["ACL"]).forEach(key => {
                if (response["data"]["ACL"][key]["status"] === "ACTIVE") {
                    activeOrPendingMspIDs.push(_.pull(response["data"]["ACL"][key]["entities"], mspIDFromJWT)[0]);
                }
            })


            return {
                status: 200,
                data: _.difference(uniqueMspIDs, activeOrPendingMspIDs)
            };
        } else {
            return response;
        }

    }


    /**
     *
     * @param body object with keys targetOrg and optional comment
     * @param mspIDFromJWT
     */
    async requestAccess(body: any, mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] Called requestAccess`);

        body = AccessMgmtClient.processUpdateBody(body);

        const ACL = await this.getAccessControlList(mspIDFromJWT);

        if (ACL["data"]["ACL"].hasOwnProperty([body.targetOrg, mspIDFromJWT].sort().join(""))) {
            Logger.info(`[${mspIDFromJWT}] Relationship already exists between ${body.targetOrg} and ${mspIDFromJWT}, calling updateRequest now`);
            const payload = {
                "targetOrg": body.targetOrg,
                "status": "PENDING",
                "comment": body.comment
            };
            return await Response.processResponse(
                await this.processTransaction('updateRequest', mspIDFromJWT, Iterable.create(payload), 'submit'),
                false,
                mspIDFromJWT,
                false
            );

        } else {
            Logger.info(`[${mspIDFromJWT}] Relationship already DOES NOT exist between ${body.targetOrg} and ${mspIDFromJWT}, calling createRequest now`);
            const payload = {
                "targetOrg": body.targetOrg,
                "comment": body.comment
            };
            return await Response.processResponse(
                await this.processTransaction('createRequest', mspIDFromJWT, Iterable.create(payload), 'submit'),
                false,
                mspIDFromJWT,
                true
            );
        }

    }


    /**
     *
     * @param body object with keys targetOrg and optional comment
     * @param mspIDFromJWT
     */
    async acceptAccessRequest(body: any, mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] Called requestAccess`);

        body = AccessMgmtClient.processUpdateBody(body);

        Logger.debug(`[${mspIDFromJWT}] Ready for transaction in requestAccess`);
        const payload = {
            "targetOrg": body.targetOrg,
            "status": "ACTIVE",
            "comment": body.comment
        };
        return await Response.processResponse(
            await this.processTransaction('updateRequest', mspIDFromJWT, Iterable.create(payload), 'submit'),
            false,
            mspIDFromJWT,
            false
        );


    }


    /**
     *
     * @param body object with keys targetOrg and optional comment
     * @param mspIDFromJWT
     */
    async removeAccess(body: any, mspIDFromJWT: string) {
        Logger.info(`[${mspIDFromJWT}] Called requestAccess`);

        body = AccessMgmtClient.processUpdateBody(body);

        Logger.debug(`[${mspIDFromJWT}] Ready for transaction in requestAccess`);
        const payload = {
            "targetOrg": body.targetOrg,
            "status": "INACTIVE",
            "comment": body.comment
        };
        return await Response.processResponse(
            await this.processTransaction('updateRequest', mspIDFromJWT, Iterable.create(payload), 'submit'),
            false,
            mspIDFromJWT,
            false
        );


    }


    static processUpdateBody(body: any) {

        if (!body.hasOwnProperty("comment")) {
            Logger.info(`Request body ${JSON.stringify(body)} is missing comment, creating default comment`);
            body["comment"] = "Default comment";
        }

        if (!body.hasOwnProperty("targetOrg") || body.targetOrg.length < 1) {
            Logger.info(`Request body ${JSON.stringify(body)} is missing targetOrg or it is an empty string`);
            throw new customErrors.BadRequestError(`Body is missing targetOrg key or it is an empty string!`);
        }

        return body;
    }


}