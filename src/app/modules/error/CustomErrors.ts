


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

export class FabricError extends Error {
    constructor(m: string) {
        super(m);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, FabricError.prototype);
    }

    getStatusCode() {
        return 500;
    }
}

/**
 * Something is wrong with the supplied JWT token
 */
export class JWTError extends Error {
    constructor(m: string) {
        super(m);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, JWTError.prototype);
    }

    getStatusCode() {
        return 403;
    }
}

/**
 * Something is wrong with the deployment of the pod, e.g. a file is missing
 */
export class DeploymentError extends Error {
    constructor(m: string) {
        super(m);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, DeploymentError.prototype);
    }

    getStatusCode() {
        return 500;
    }
}


/**
 * Something is wrong with the request by the user
 */
export class BadRequestError extends Error {
    constructor(m: string) {
        super(m);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, BadRequestError.prototype);
    }

    getStatusCode() {
        return 400;
    }
}