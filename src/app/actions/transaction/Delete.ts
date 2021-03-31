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
import Response from '../../modules/response/Response';
import Logger from "../../modules/logger/Logger";

/**
 * Delete transaction action
 * @param req
 * @param res
 * @param next
 * @constructor
 */
export default async function Delete(req: any, res: any, next: any) {
    const client = new TransactionClient;
    const ids = req.body.transactions;
    Logger.info(`Called Delete with "${JSON.stringify(ids)}"`);

    const jwt = JWT.parseFromHeader(
        req.header('Authorization')
    );

    return await client.deleteTransaction(
        ids,
        JWT.parseUserIDFromHeader(req.header('Authorization')),
        JWT.parseMspIDFromToken(jwt)
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
 * /v1/transaction/delete:
 *   post:
 *     security:
 *       - Bearer: []
 *     description: Query transactions from the database by given filters
 *     tags: ['transaction']
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: transactionID
 *         description: List of transaction ID to delete
 *         in:  body
 *         required: true
 *         type: array
 *         schema:
 *           items:
 *             type: string
 *     responses:
 *       200:
 *         description:  Status message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Status of operation
 */
