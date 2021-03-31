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

import TransactionClient from "../../domains/TransactionClient";
import JWT from './../../modules/jwt/JWT';
import Objects from '../../modules/mapper/Objects';
import Strings from '../../modules/mapper/Strings';
import Response from '../../modules/response/Response';
import Logger from "../../modules/logger/Logger";

/**
 * Create transaction action
 * @param req
 * @param res
 * @param next
 * @constructor
 */
export default async function Create(req: any, res: any, next: any) {
    const client = new TransactionClient;
    const tx = req.body;
    Logger.info(`Called Create with "${JSON.stringify(tx)}"`);

    const jwt = JWT.parseFromHeader(
        req.header('Authorization')
    );

    tx.userId = JWT.parseUserIDFromHeader(
        req.header('Authorization')
    );
    tx.timestampCreated = new Date().getTime();
    tx.timestampChanged = new Date().getTime();

    return await client.createTransaction(
        tx,
        JWT.parseMspIDFromToken(jwt)
    ).then(
        (response: any) => Response.json(
            res,
            Objects.mapKeys(response.toJSON(), Strings.snakeCaseToCamelCase),
            200
        )
    )
        .catch(
            (error: any) => {
                return Response.json(res, Response.errorObject(
                    Response.errorPayload(error), Response.errorStatusCode(error)
                ), Response.errorStatusCode(error))
            }
        );
}
/**
 * @ignore
 * @swagger
 * /v1/transaction/create:
 *   post:
 *     security:
 *       - Bearer: []
 *     description: Update state of an asset
 *     tags: ['transaction']
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: Transaction
 *         description: create transaction
 *         in: body
 *         required: true
 *         type: array
 *         schema:
 *           $ref: '#/definitions/TransactionInput'
 *     responses:
 *       200:
 *         description:  List of objects matched by given filters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Transaction'
 */
