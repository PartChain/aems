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
 * @enum RelationshipStatusType
 */
export enum RelationshipStatusType {
    unknown = 0, // Default status when creating a new relationship: we yet have to determine whether the asset is available in the ledger or not
    childInPublicLedger = 1, // The child asset was found in the ledger, but is not yet exchanged
    parentShared = 2, // The Parent asset got shared with the child mspId, but the child is no shared yet !
    childShared = 3, // The parent asset and the child asset got exchanged!
    notInFabric = 4, // Child is currently not stored in Fabric Public Ledger
    parentExchangeFailure = 5, // There was a failure when trying to share an asset
    childExchangeFailure = 6,
    parentHashValidationFailure = 7, // There was a failure validating the hash of the exchanged asset
    childHashValidationFailure = 8,
    requestAssetNotAllowed = 9, // You don`t have the permission to request this asset from this mspID
    updatePending = 10, // The parent flagged the child and want the child mspID to update the qualityStatus
}
