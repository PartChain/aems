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

import route, { getRouteOptions } from "../modules/route/route";
import CreateInvestigation from "../actions/investigation/CreateInvestigation";
import GetAllInvestigations from "../actions/investigation/GetAllInvestigations";
import AddOrganisationToInvestigation from '../actions/investigation/AddOrganisationToInvestigation'
import RejectInvestigation from '../actions/investigation/RejectInvestigation'
import AcceptInvestigation from '../actions/investigation/AcceptInvestigation'
import GetPublicInvestigationDetails from '../actions/investigation/GetPublicInvestigationDetails'
import AddSerialNumberCustomerToInvestigation from '../actions/investigation/AddSerialNumberCustomer'

/**
 * create an Investigation
 */
const createInvestigation = route('create-investigation', CreateInvestigation, getRouteOptions("post"));

/**
 * add org to an Investigation
 */
const addOrgToInvestigation = route('add-org-investigation', AddOrganisationToInvestigation, getRouteOptions("post"));

/**
 * Accept Investigation request
 */
const acceptInvestigation = route('accept-investigation', AcceptInvestigation, getRouteOptions("post"));

/**
 * Reject Investigation request
 */
const rejectInvestigation = route('reject-investigation', RejectInvestigation, getRouteOptions("post"));

/**
 * add serial number customer Investigation request
 */
const addSerialNumberCustomer = route('add-serialNumberCustomer', AddSerialNumberCustomerToInvestigation, getRouteOptions("post"));

/**
 * create an Investigation
 */
const getAllInvestigations = route('get-all-investigations', GetAllInvestigations, getRouteOptions("get"));

/**
 * get public Investigation details
 */
const getPublicInvestigations = route('get-public-investigations', GetPublicInvestigationDetails, getRouteOptions("get"));

/**
 * Smart Contract API router
 * @export object
 */
export default {
    pathPrefix: `v1/investigation`,
    data: [
        createInvestigation,
        addOrgToInvestigation,
        acceptInvestigation,
        rejectInvestigation,
        getAllInvestigations,
        getPublicInvestigations,
        addSerialNumberCustomer
    ]
}