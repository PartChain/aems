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
import StoreAsset from './../actions/smart-contract/StoreAsset';
import UpdateAsset from "../actions/smart-contract/UpdateAsset";
import UpsertAsset from "../actions/smart-contract/UpsertAsset";


/**
 * Global options for all routes
 */

/**
 * Store asset route
 */
const storeAsset = route('store-asset', StoreAsset, getRouteOptions("post"));

/**
 * Update asset route
 */
const updateAsset = route('update-asset', UpdateAsset, getRouteOptions("post"));

/**
 * Upsert asset route
 */
const upsertAsset = route('upsert-asset', UpsertAsset, getRouteOptions("post"));

/**
 * Smart Contract API router
 * @export object
 */
export default {
    pathPrefix: 'v1/smart-contract',
    data: [
        storeAsset,
        updateAsset,
        upsertAsset
    ]
}
