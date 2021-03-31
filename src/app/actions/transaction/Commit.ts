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
import Logger from "../../modules/logger/Logger";
import Response from "../../modules/response/Response";

/**
 * Commit transaction action
 * @param req
 * @param res
 * @param next
 * @constructor
 */
export default async function Commit(req: any, res: any, next: any) {
    const client = new TransactionClient;
    const ids = req.body.transactions;
    Logger.info(`Called Commit with "${JSON.stringify(ids)}"`);

    return await client.commitTransaction(
        ids,
        JWT.parseMspIDFromToken(JWT.parseFromHeader(req.header('Authorization')))
    ).then(
        (response: any) => {
            return Response.json(res, Response.successObject(
                JSON.parse(JSON.stringify(response)),
                200
            ), 200);
        }
    ).catch(
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
 * /v1/transaction/commit:
 *   post:
 *     security:
 *       - Bearer: []
 *     description: Query transactions from the database by given filters
 *     tags: ['transaction']
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: transactionID
 *         description: List of transaction ID to commit
 *         in:  body
 *         required: true
 *         type: array
 *         schema:
 *           items:
 *             type: string
 *
 *     responses:
 *       200:
 *         description:  List of objects matched by given filters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Transaction'
 */
