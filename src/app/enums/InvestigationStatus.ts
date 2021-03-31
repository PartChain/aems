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

/**
 * Investigation status enumeration
 * @enum InvestigationStatus
 * @export InvestigationStatus
 */
export enum InvestigationStatus {
    ACCEPT = 'approved',
    REJECTED = 'rejected',
    CLOSE = 'closed',
    ACTIVE = 'active'
}

/**
 * Investigation status for serialNumberCustomer enumeration
 * @enum InvestigationSerialNumberStatus
 * @export InvestigationSerialNumberStatus
 */

export enum InvestigationSerialNumberStatus{
    assetAddedToInvestigationTable = 11,
    assetDetailsRequested = 12,
    assetDetailsReceived = 13
}
