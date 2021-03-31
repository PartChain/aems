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

import JWT from './../../modules/jwt/JWT';
import Response from '../../modules/response/Response';
import AccessMgmtClient from "../../domains/AccessMgmtClient";

/**
 * Deny an access request for your private data collection
 * @param req
 * @param res
 * @param next
 * @constructor
 */
export default async function DenyAccessRequest(req: any, res: any, next: any) {
    const client = new AccessMgmtClient();
    const jwt = JWT.parseFromHeader(
        req.header('Authorization')
    );

    return await client.removeAccess(
        req.body,
        JWT.parseMspIDFromToken(jwt)
    ).then(
        (response: any) => {
            Response.json(res, response, 200);
        }
    ).catch(
        (error: any) => Response.json(res, Response.errorPayload(error), Response.errorStatusCode(error))
    );
}
/**
 * @ignore
 * @swagger
 * /v1/access-mgmt/deny-access-request:
 *   post:
 *     security:
 *       - Bearer: []
 *     description: Deny an access request for your private data collection
 *     tags: ['access-mgmt']
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: Access Control List Request
 *         description: Change the ACL between you and a partner in the Fabric network
 *         in: body
 *         required: true
 *         type: array
 *         schema:
 *           $ref: '#/definitions/ACLUpdateRequest'
 *     responses:
 *       200:
 *         description: success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/ACL'
 */
