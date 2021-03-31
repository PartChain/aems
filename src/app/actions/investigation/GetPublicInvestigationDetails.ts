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
import Logger from '../../modules/logger/Logger';


/**
 * Get Public investigation  details
 * @param req
 * @param res
 * @param next
 * @constructor
 */
export default async function GetPublicInvestigationDetails(req: any, res: any, next: any) {
    const client = new InvestigationClient();
    const jwt = JWT.parseFromHeader(
        req.header('Authorization')
    );
    // validate the payload
    try{
        Logger.info(`Query params = ${JSON.stringify(req.query)}`);
        await client.processBodyForInvestigationID(req.query);
    }catch(error){
        Response.json(res, Response.errorPayload(error), Response.errorStatusCode(error))
    };
    const { investigationID } = req.query;
    return await Response.processResponse(await client.getPublicInvestigationDetails(
        investigationID,
        JWT.parseMspIDFromToken(jwt)
    )).then(
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
 * /v1/investigation/get-public-investigations:
 *   get:
 *     security:
 *       - Bearer: []
 *     description: get public investigation details
 *     tags: ['investigation']
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: investigationID
 *         description: investigationID 
 *         in: query
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
