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
 * Create transaction action
 * @param req
 * @param res
 * @param next
 * @constructor
 */
export default async function CreateMultiple(req: any, res: any, next: any) {
    const client = new TransactionClient;
    let successList: string[] = [];
    let failList: string[] = [];
    const txList = req.body;
    Logger.info(`Called Create with "${JSON.stringify(txList)}"`);

    if (txList instanceof Array && txList.length > 0 && txList.length < 1000) {
        for (const tx of txList) {
            let iterator = txList.indexOf(tx);
            try {
                const jwt = JWT.parseFromHeader(
                    req.header('Authorization')
                );

                tx.userId = JWT.parseUserIDFromHeader(
                    req.header('Authorization')
                );
                tx.timestampCreated = new Date().getTime();
                tx.timestampChanged = new Date().getTime();
                Logger.info(`Processing transaction for ${tx.serialNumberCustomer} with input  ${JSON.stringify(tx)}`);
                let result = await client.createTransaction(tx, JWT.parseMspIDFromToken(jwt))
                Logger.info(`Result = ${result}`);
                successList.push(result);
                if (iterator == txList.length - 1) {
                    Response.json(res, {sucessList: successList, failedList: failList}, 200);
                }
            } catch (err) {
                failList.push(tx.serialNumberCustomer);
                Logger.error(` Transaction process failed for ${tx.serialNumberCustomer} with error ${err}`);
            }
        }
    } else if(txList.length >= 1000) {
        return Response.json(res, { data: "Transaction limit exceed. Not more than 1000" }, 406);
    }else {
        return Response.json(res, { data: "Invalid parameter to the function" }, 500);
    }
}
/**
 * @ignore
 * @swagger
 * /v1/transaction/CreateMultiple:
 *   post:
 *     security:
 *       - Bearer: []
 *     description: Update state of multiple asset
 *     tags: ['transaction']
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: Transaction
 *         description: multiple transaction
 *         in: body
 *         required: true
 *         type: array
 *         schema:
 *           $ref: '#/definitions/TransactionListInput'
 *     responses:
 *       200:
 *         description:  List of objects matched by given filters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/definitions/Transaction'
 */
