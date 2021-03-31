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

import route, {getRouteOptions} from './../modules/route/route';
import AcceptAccessRequest from "../actions/access-mgmt/AcceptAccessRequest";
import DenyAccessRequest from "../actions/access-mgmt/DenyAccessRequest";
import RemoveAccess from "../actions/access-mgmt/RemoveAccess";
import GetAccessRequests from "../actions/access-mgmt/GetAccessRequests";
import GetAccessControlList from "../actions/access-mgmt/GetAccessControlList";
import RequestAccess from "../actions/access-mgmt/RequestAccess";
import GetAccessRequestRecommendations from "../actions/access-mgmt/GetAccessRequestRecommendations";


/**
 * Global options for all routes
 */


/**
 * accept Access Request for a mspID
 */
const acceptAccessRequest = route('accept-access-request', AcceptAccessRequest, getRouteOptions("post"));

/**
 * deny Access Request for a mspID
 */
const denyAccessRequest = route('deny-access-request', DenyAccessRequest, getRouteOptions("post"));

/**
 * remove access for a mspID
 */
const removeAccess = route('remove-access', RemoveAccess, getRouteOptions("post"));

/**
 * request access for a mspID
 */
const requestAccess = route('request-access', RequestAccess, getRouteOptions("post"));

/**
 * list Access Requests
 */
const getAccessRequests = route('get-access-requests', GetAccessRequests, getRouteOptions("get"));

/**
 * list Access
 */
const getAccessControlList = route('get-access-control-list', GetAccessControlList, getRouteOptions("get"));

/**
 * list Access
 */
const getAccessRequestRecommendations = route('get-access-request-recommendations', GetAccessRequestRecommendations, getRouteOptions("get"));

/**
 * Smart Contract API router
 * @export object
 */
export default {
    pathPrefix: `v1/access-mgmt`,
    data: [
        acceptAccessRequest,
        denyAccessRequest,
        removeAccess,
        getAccessControlList,
        getAccessRequestRecommendations,
        getAccessRequests,
        requestAccess
    ]
}
