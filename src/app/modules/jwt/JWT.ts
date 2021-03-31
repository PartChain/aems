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

import Logger from "../logger/Logger";
import {decode as decode} from "jsonwebtoken";
import * as customErrors from '../error/CustomErrors'

/**
 * @class JWT
 */
export default class JWT {

    /**
     *
     * @param header
     */
    static parseFromHeader(header: string) {
        return header
            .replace('bearer', '')
            .replace('Bearer', '')
            .trim();
    }

    /**
     *
     * @param header
     */
    static parseUserIDFromHeader(header: string) {
        return JWT.parseUserIDFromToken(
            JWT.parseFromHeader(header)
        );
    }

    /**
     *
     * @param token
     */
    static parseUserIDFromToken(token: string) {
        const decoded = JWT.decode(token);
        return !!decoded.sub ? decoded.sub : undefined;
    }

    /**
     *
     * @param token
     */
    static parseMspIDFromToken(token: string) {
        const decoded : any = JWT.decode(token);
        if(decoded.hasOwnProperty("mspid")){
            return decoded.mspid;
        }
        else{
            throw new customErrors.JWTError("JWT Token is missing mspid!");
        }
    }

    /**
     *
     * @param token
     */
    static parseIssuerFromToken(token: string) {
        const decoded = JWT.decode(token);
        // @ts-ignore
        return !!decoded.iss ? decoded.iss : undefined;
    }

    /**
     *
     * @param token
     */
    static parseRealmFromToken(token: string) {
        const issuer = JWT.parseIssuerFromToken(token).split('/');
        return issuer[(issuer.length - 1)];
    }

    /**
     *
     * @param jwt
     */
    static decode(jwt: string) {
        Logger.debug(`Decoding token "${jwt}"`);
        return decode(jwt);
    }

    /**
     *
     */
    static getPermittedChannelList(jwt: string) {
        const decodedToken = JWT.decode(jwt);

        if (decodedToken.hasOwnProperty('partchain-channels')) {
            // @ts-ignore
            return decodedToken['partchain-channels'].split(',');
        }else {
            throw new customErrors.JWTError("JWT Token is missing partchain-channels!");
        }
    }

    /**
     * get chaincode name
     */
      static getChaincode(jwt: string) {
        const decodedToken = JWT.decode(jwt);
        if (decodedToken.hasOwnProperty('chaincode')) {
            // @ts-ignore
             return decodedToken['chaincode'];
           }
            return "";
        }


}
