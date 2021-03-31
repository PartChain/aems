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
import InvestigationClient from "../../domains/InvestigationClient";

/**
 * Add new organisation to investigation
 * @param req
 * @param res
 * @param next
 * @constructor
 */
export default async function AddOrganisationToInvestigation(req: any, res: any, next: any) {
    const client = new InvestigationClient();
    const jwt = JWT.parseFromHeader(
        req.header('Authorization')
    );

    // validate the payload
    try {
        await client.processBodyForAddingOrgToInvestigationID(req.body);
    } catch (error) {
        Response.json(res, Response.errorPayload(error), Response.errorStatusCode(error))
    };
    return await client.addOrganisationToInvestigation(
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
 * /v1/investigation/addorganisation-to-investigation:
 *   post:
 *     security:
 *       - Bearer: []
 *     description: adds a new organisation to the investigation
 *     tags: ['investigation']
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: investigationID
 *         description: investigationID
 *         in: body
 *         required: true
 *         type: string
 *       - name: targetOrg
 *         description: targetOrg
 *         in: body
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Investigation'
 */
