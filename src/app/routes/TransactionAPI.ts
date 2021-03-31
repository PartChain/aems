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

import Commit from './../actions/transaction/Commit';
import Create from './../actions/transaction/Create';
import CreateMultiple from './../actions/transaction/CreateMultiple';
import Delete from './../actions/transaction/Delete';
import route, {getRouteOptions} from './../modules/route/route';
import Browse from "../actions/transaction/Browse";
import GetAssetTransactionHistory from "../actions/transaction/AssetTransactionHistory";

/**
 * Global options for all routes
 */

/**
 * Browse route
 */
const browse = route('browse', Browse, getRouteOptions("post"));

/**
 * AssetTransactionHistory route
 */
const getAssetTransactionHistory = route('get-asset-transaction-history', GetAssetTransactionHistory, getRouteOptions("get"));

/**
 * Commit route
 */
const commit = route('commit', Commit, getRouteOptions("post"));

/**
 * CreateMultiple route
 */
const createMultiple = route('createMultiple', CreateMultiple, getRouteOptions("post"));

/**
 * Create route
 */
const create = route('create', Create, getRouteOptions("post"));

/**
 * Remove route
 */
const remove = route('delete', Delete, getRouteOptions("post"));


/**
 * Transaction API router
 * @export object
 */
export default {
    pathPrefix: 'v1/transaction',
    data: [
        browse,
        getAssetTransactionHistory,
        commit,
        create,
        createMultiple,
        remove
    ]
}
