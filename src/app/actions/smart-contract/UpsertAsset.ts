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

import SmartContractClient from "./../../domains/SmartContractClient";
import JWT from './../../modules/jwt/JWT';
import Response from '../../modules/response/Response';

/**
 * Upsert asset into the Ledger action
 * @param req
 * @param res
 * @param next
 * @constructor
 */
export default async function  UpsertAsset(req: any, res: any, next: any) {
    const client = new SmartContractClient;
    const jwt = JWT.parseFromHeader(
        req.header('Authorization')
    );

    if(!req.body.hasOwnProperty("asset")){
        return Response.json(res, Response.errorPayload(`Request body is missing asset key`), 400);
    }

    return await client.upsertAsset(
        req.body.asset,
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
 * /v1/smart-contract/upsert-asset:
 *   post:
 *     security:
 *       - Bearer: []
 *     description: Upsert an asset
 *     tags: ['smart-contract']
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: asset
 *         description: List of asset objects
 *         in: body
 *         required: true
 *         type: array
 *         schema:
 *           $ref: '#/definitions/AssetList'
 *     responses:
 *       200:
 *         description: object with information about transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/AssetResponse'
 */
