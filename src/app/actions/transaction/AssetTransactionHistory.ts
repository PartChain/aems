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

import JWT from '../../modules/jwt/JWT';
import Response from "../../modules/response/Response";
import TransactionClient from "../../domains/TransactionClient";
import Objects from "../../modules/mapper/Objects";
import Strings from "../../modules/mapper/Strings";

/**
 * Gets the transaction history of a specific asset
 * @param req
 * @param res
 * @param next
 * @constructor
 */
export default async function GetAssetTransactionHistory(req: any, res: any, next: any) {
    const client = new TransactionClient;
    const jwt = JWT.parseFromHeader(
        req.header('Authorization')
    );

    if (!req.query.hasOwnProperty("serialNumberCustomer")) {
        return Response.json(res, Response.errorPayload(`Request is missing key serialNumberCustomer`), 400);
    }

    let serialNumberCustomer: string = decodeURIComponent(req.query.serialNumberCustomer);
    let propertyName: string = req.query.hasOwnProperty("propertyName") ? decodeURIComponent(req.query.propertyName): null;

    return client.getAssetTransactionHistory(serialNumberCustomer, propertyName, JWT.parseMspIDFromToken(jwt))
        .then(
            (response: any) => Response.json(
                res,
                response.map(
                    (tx: any) => Objects.mapKeys(tx.toJSON(), Strings.snakeCaseToCamelCase)
                ),
                200
            )).catch(
            (error: any) => Response.json(res, Response.errorPayload(error), Response.errorStatusCode(error))
        );


}
/**
 * @ignore
 * @swagger
 * /v1/transaction/get-asset-transaction-history:
 *   get:
 *     security:
 *       - Bearer: []
 *     description: Gets the transaction of a specific asset
 *     tags: ['transaction']
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: serialNumberCustomer
 *         description: Serial Number Customer
 *         schema:
 *           type: string
 *       - in: query
 *         name: propertyName
 *         description: Filter for a specific field
 *         required: false
 *         schema:
 *           type: string
 *
 *     responses:
 *       200:
 *         description: asset transaction history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       transactionId:
 *                         type: number
 *                       serialNumberCustomer:
 *                         type: string
 *                       TimestampCreated:
 *                         type: string
 *                       TimestampUpdated:
 *                         type: string
 *                       PropertyNewValue:
 *                         type: string
 *                       PropertyOldValue:
 *                         type: string
 *                       status:
 *                         type: string
 *                       userId:
 *                         type: string
 *                       propertyName:
 *                         type: string
 *
 */

