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

import JWT from "./../../modules/jwt/JWT";
import Response from "../../modules/response/Response";
import InvestigationClient from "../../domains/InvestigationClient";
import { InvestigationStatus } from "../../enums/InvestigationStatus";

/**
 * Accept investigation
 * @param req
 * @param res
 * @param next
 * @constructor
 */
export default async function AcceptInvestigation(req: any, res: any, next: any) {
	const client = new InvestigationClient();
	const jwt = JWT.parseFromHeader(req.header("Authorization"));

	if (!req.body.hasOwnProperty("investigationID")) {
		return Response.json(res, Response.errorPayload(`Request body is missing investigationID key`), 400);
	}
	const { investigationID } = req.body;
	return await client
		.updateInvestigationStatus(investigationID, InvestigationStatus.ACCEPT, JWT.parseMspIDFromToken(jwt))
		.then((response: any) => {
			Response.json(res, response, 200);
		})
		.catch((error: any) => Response.json(res, Response.errorPayload(error), Response.errorStatusCode(error)));
}
/**
 * @ignore
 * @swagger
 * /v1/investigation/accept-investigation:
 *   post:
 *     security:
 *       - Bearer: []
 *     description: accept investigation
 *     tags: ['investigation']
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: investigationID
 *         description: investigationID
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
