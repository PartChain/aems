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

import SmartContractClient from "./SmartContractClient";
import Logger from "../modules/logger/Logger";
import Response from "../modules/response/Response";
import { generateID } from "../modules/helper-functions/Helper";

/**
 *
 */
export default class InvestigationClient extends SmartContractClient {
	/**
	 * create Investigation
	 * @param body
	 * @param mspIDFromJWT
	 */
	async createInvestigation(description: string, title: string, type: string, mspIDFromJWT: string) {
		Logger.info(`Called createInvestigation`);
		const investigationID = await generateID(16);
		const secret1 = await generateID(32);
		const secret2 = await generateID(32);
		const iv = await generateID(16);
		// call smart contract createInvestigation function
		const request = { investigationID, description, title, secret1, secret2, iv, type };
		Logger.info(` createInvestigation request = ${JSON.stringify(request)}`);
		Logger.debug(`[${mspIDFromJWT}] Ready for transaction in createInvestigation`);
		return await Response.processResponse(
			await this.processTransaction("createInvestigation", mspIDFromJWT, [request], "submit"),
			true,
			mspIDFromJWT,
			true
		);
	}

	/**
	 *
	 * @param investigationID
	 * @param mspIDFromJWT
	 */

	async closeInvestigation(investigationID: string, mspIDFromJWT: string) {
		Logger.info(`Called closeInvestigation`);
		Logger.info(`closeInvestigation: investigationID = ${investigationID}`);
		const request = { investigationID };
		Logger.debug(` closeInvestigation: request = ${JSON.stringify(request)}`);
		Logger.debug(`[${mspIDFromJWT}] Ready for transaction in closeInvestigation`);
		return await Response.processResponse(
			await this.processTransaction("closeInvestigation", mspIDFromJWT, [request], "submit"),
			true,
			mspIDFromJWT,
			true
		);
	}

	/**
	 *
	 * @param body
	 * @param status
	 * @param mspIDFromJWT
	 */
	async updateInvestigationStatus(investigationID: string, status: string, mspIDFromJWT: string) {
		Logger.info(`Called updateInvestigationStatus`);

		Logger.info(`updateInvestigationStatus: investigationID = ${investigationID}`);
		const request = { investigationID, status };
		Logger.debug(`[${mspIDFromJWT}] Ready for transaction in updateInvestigationStatus`);
		return await Response.processResponse(
			await this.processTransaction("updateOrgInvestigationStatus", mspIDFromJWT, [request], "submit"),
			true,
			mspIDFromJWT,
			true
		);
	}

	/**
	 *
	 * @param mspIDFromJWT
	 */
	async getAllInvestigations(mspIDFromJWT: string) {
		Logger.info(`Called getAllInvestigations`);
		const richQuery = {
			query: {
				selector: { docType: "investigation" },
				use_index: ["_design/indexInvestigationDoc", "indexInvestigation"]
			}
		};
		Logger.debug(`richQuery = ${JSON.stringify(richQuery)}`);
		let investigationList = await Response.processResponse(
			await this.processTransaction("getAllInvestigation", mspIDFromJWT, [richQuery], "eval"),
			true,
			mspIDFromJWT,
			true
		);

		Logger.info(`investigationList = ${JSON.stringify(investigationList)}`);
		// check if there is data property
		if (investigationList.hasOwnProperty("data")) {
			investigationList = investigationList.data;
			// Logger.info(`investigationList = ${JSON.stringify(investigationList)}`);
			Logger.debug(`investigationList type = ${typeof investigationList}`);
			// get all the investigationIDs
			const publicInvestigation = await this.getPublicInvestigationArrayDetails(investigationList, mspIDFromJWT);
			Logger.info(`investigationIDs = ${JSON.stringify(publicInvestigation)}`);
			return { data: publicInvestigation, status: 200 };
		}
		// return the array
		return await Response.processResponse(investigationList);
	}

	/**
	 * Get  List of public investigation details
	 * @param investigationList
	 * @param mspIDFromJWT
	 */

	async getPublicInvestigationArrayDetails(investigationList: any, mspIDFromJWT: string) {
		Logger.info(`Called getPublicInvestigationArrayDetails`);
		let investigationArray: any = [] as any;

		for (const value of investigationList) {
			let publicInvestigationDetails = await this.getPublicInvestigationDetails(value.investigationID, mspIDFromJWT);
			Logger.info(`getPublicInvestigationArrayDetails of investigationID ${value.investigationID}: ${JSON.stringify(publicInvestigationDetails)}`);
			if (publicInvestigationDetails[0].data != null) {
				investigationArray.push(publicInvestigationDetails[0].data);
			} else {
				Logger.error(`Error occured for getting investigation of ${value.investigationID}`);
			}
		}
		return investigationArray;
	}

	/**
	 *  Add serialNumberCustomer to investigation
	 * @param componentsSerialNumbers
	 * @param investigationID
	 * @param mspIDFromJWT
	 */
	//async addAssetsToInvestigation(componentsSerialNumbers: Array<string>, investigationID: string, mspIDFromJWT: string) {

	async addAssetsToInvestigation(investigationID: string, componentsSerialNumbers: string[], mspIDFromJWT: string) {
		Logger.info(`Called addAssetsToInvestigation`);
		const request = { componentsSerialNumbers, investigationID };
		Logger.debug(`[${mspIDFromJWT}] Ready for transaction in addAssetsToInvestigation = ${JSON.stringify(request)}`);
		return await Response.processResponse(
			await this.processTransaction("addSerialNumberCustomer", mspIDFromJWT, [request], "submit"),
			true,
			mspIDFromJWT,
			true
		);
	}

	/**
	 *  Add new organisation to investigation
	 * @param investigationID
	 * @param participatingOrgs
	 * @param mspIDFromJWT
	 */
	async addOrganisationToInvestigation(investigationID: string, participatingOrgs: string[], mspIDFromJWT: string) {
		Logger.info(`Called addOrganisationToInvestigation`);
		let targetOrgAddedSuccess: string[] = [];
		let targetOrgAddedFail: string[] = [];
		//Find the private details of the investigation
		const investigationPrivate = (await this.getPrivateInvestigationDetails(investigationID, mspIDFromJWT)) as any;
		Logger.debug(`Private information of  investigation = ${JSON.stringify(investigationPrivate)}`);
		// check if investigation exist
		if (investigationPrivate[0].status == 200) {
			//Find the secret1  and iv to the current investigation
			Logger.debug(`Data = ${investigationPrivate[0].data}`);
			const { secret1, iv } = investigationPrivate[0].data;
			Logger.debug(`secret1 = ${secret1} & iv = ${iv}`);
			// Share inital investigation details with participating orgs
			for (const targetOrg of participatingOrgs) {
				let iterator = participatingOrgs.indexOf(targetOrg);
				//Call the smartcontract function with investigationID,secret1 ,targetOrg and iv
				const request = { investigationID, secret1, targetOrg, iv };

				const addOrgResult = await this.processTransaction("addOrganisationToInvestigation", mspIDFromJWT, [request], "submit");
				if (addOrgResult[0].status == 200) {
					targetOrgAddedSuccess.push(targetOrg);
				} else {
					Logger.error(`[${mspIDFromJWT}]  addOrganisationToInvestigation: Failed for investigationID = ${investigationID}`);
					targetOrgAddedFail.push(targetOrg);
				}
				// return the success list and failed list back
				if (iterator == participatingOrgs.length - 1) {
					return { successList: targetOrgAddedSuccess, failedList: targetOrgAddedFail };
				}
			}
		} else {
			Logger.error(
				`[${mspIDFromJWT}]  addOrganisationToInvestigation: Failed to get investigation private details investigationID = ${investigationID}`
			);
			throw new Error(`Failed to get investigation private details of investigationID = ${investigationID}`);
		}
	}

	/**
	 * Get public investigation details
	 * @param investigationID
	 * @param mspIDFromJWT
	 */

	async getPublicInvestigationDetails(investigationID: string, mspIDFromJWT: string) {
		Logger.info(`Called getPublicInvestigationDetails`);
		const request = { investigationID };
		Logger.info(` getPublicInvestigationDetails request = ${JSON.stringify(request)}`);
		return await this.processTransaction("getPublicInvestigation", mspIDFromJWT, [request], "eval");
	}

	/**
	 * get Private Investigation Details
	 * @param investigationID
	 * @param mspIDFromJWT
	 */

	async getPrivateInvestigationDetails(investigationID: string, mspIDFromJWT: string) {
		Logger.info(`Called getPrivateInvestigationDetails`);

		const request = { investigationID };
		return await this.processTransaction("getPrivateInvestigation", mspIDFromJWT, [request], "eval");
	}
}
