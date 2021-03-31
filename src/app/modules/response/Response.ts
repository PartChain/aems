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
import env from "../../defaults";
import errorToJSON from 'error-to-json'


/**
 * @class Response
 * @module Response
 */
export default class Response {

    /**
     * Create JSON response object
     * @static
     * @param res
     * @param payload
     * @param status
     */
    static json(res: any, payload: any, status: number = 200) {
        let finalStatus = payload.status && !isNaN(payload.status) ? payload.status : status;

        return res
            .status(finalStatus)
            .json(payload.status && !isNaN(payload.status) ? payload : Response.prepareObject(payload, status));
    }

    /**
     * Checks if the error is one of our custom errors where we can apply a better HTTP code instead of just 500
     * @param error
     */
    static errorStatusCode(error: any){
        if (typeof error.getStatusCode === "function") {
            // safe to use the function
            return error.getStatusCode();
        }
        else{
            // default error code
            return 500;
        }
    }

    /**
     * Prepare object for response
     * @static
     * @param payload
     * @param status
     */
    static prepareObject(payload: any, status: number) {
        if (status >= 200 && status < 400) {
            return Response.successObject(payload, status);
        }
        Logger.error(`Error in response: ${JSON.stringify(payload)}`);
        return Response.errorObject(payload, status);
    }

    /**
     * Create an error object
     * @static
     * @param payload
     * @param status
     */
    static errorObject(payload: JSON, status: number) {
        return {
            error: payload,
            status: status
        }
    }

    /**
     * Create an error payload
     * @static
     * @param error
     */
    static errorPayload(error: any) {
        try{
            error = errorToJSON(error);
        }
        catch (e){
            Logger.debug(`errorToJSON of ${error} was not possible.  Most likely the error is just not a valid error object.`);
        }
        return JSON.parse(
            JSON.stringify(
                Array.isArray(error)
                    ? error
                    : [error]
            )
        );
    }

    /**
     * Create and success object
     * @static
     * @param payload
     * @param status
     */
    static successObject(payload: JSON, status: number) {
        return {
            data: payload,
            status: status
        };
    }

    /**
     * Create response object from given multiple request responses
     * @static
     * @param acc
     * @param returnArray
     * @param jwt
     * @param errorAllowDataPayload
     * @param forceDataPayload
     * @param pagination
     */
    static async processResponse(acc: any, returnArray: boolean = false, jwt: string = undefined, errorAllowDataPayload: boolean = false, forceDataPayload: boolean = false, pagination: number = 0) {
        if (!Array.isArray(acc)) {
            acc = [acc];
        }
        Logger.debug(`Called processResponse with acc = ${JSON.stringify(acc)}, returnArray = ${returnArray}, errorAllowDataPayload = ${errorAllowDataPayload}, forceDataPayload = ${forceDataPayload}`);

        const status = Response.resolveStatus(Response.arrayColumn(acc, 'status'));
        Logger.debug(`Resolved status code is ${status}`);

        const finalCollection: any = {
            data: [],
            error: []
        };

        for (let collection of acc) {
            Logger.debug(`- acc collection start`);
            if (
                collection.status
                && (
                    (Number(collection.status) === Number(status))
                    || (errorAllowDataPayload === true && Number(collection.status) === 200)
                    || (forceDataPayload === true)
                )
            ) {
                if (collection.data) {
                    finalCollection.data = finalCollection.data.concat(collection.data);
                }
                if (collection.error) {
                    finalCollection.error = finalCollection.error.concat(collection.error);
                }
            }
            Logger.debug(`- acc collection end`);
        }

        let nextPage = false;
        let resultLength = 0;

        if (finalCollection.data.length > 0) {
            resultLength = finalCollection.data.length;
        }

        if (pagination > 0 && finalCollection.data.length > 0) {
            const limit = env.paginationLimit;
            const end = pagination * limit;
            const start = end - limit;
            if (end < finalCollection.data.length) {
                nextPage = true;
            }
            Logger.info(`apply pagination - (${start},${end}) from ${finalCollection.data.length}`);
            finalCollection.data = finalCollection.data.slice(start, end);
            Logger.info(`collection length after pagination reduce ${finalCollection.data.length}`);
        }


        const response = Object.create({});
        response.status = status;
        response.error = [];
        response.data = [];

        if (resultLength >= 0) {
            response.resultLength = resultLength;
        }

        if (nextPage === true) {
            response.nextPage = true;
        }

        const dataMap = Object.create({});
//        for (let collection of accMatch) {
        Logger.debug(`- acc collection(2) start`);

        if (finalCollection.data) {
            Logger.debug(`- acc collection(2) has length ${finalCollection.data.length}`);
            Logger.debug('Data = ' + JSON.stringify(finalCollection.data));

            Logger.debug(`-- data processing start`);
            (Array.isArray(finalCollection.data) ? finalCollection.data : [finalCollection.data]).forEach(
                (item: any) => {
                    if (item.hasOwnProperty('serialNumberCustomer')) {
                        // Proccess assets
                        if (dataMap[item.serialNumberCustomer]) {
                            if (item.hasOwnProperty('childComponents')) {
                                const merge = JSON.parse(
                                    JSON.stringify(
                                        (dataMap[item.serialNumberCustomer].childComponents
                                            ? dataMap[item.serialNumberCustomer].childComponents
                                            : [])
                                    )
                                ).concat(
                                    JSON.parse(
                                        JSON.stringify(
                                            (item.childComponents
                                                ? item.childComponents
                                                : [])
                                        )
                                    )
                                );

                                dataMap[item.serialNumberCustomer].childComponents = merge.reduce(Response.distinctChildren, []);
                            }
                        } else {
                            dataMap[item.serialNumberCustomer] = item;
                        }
                    } else if (item.hasOwnProperty('hash') && item.hasOwnProperty('timestamp')) {
                        // Process history
                        // use hash + creation Timestamp as unique identifier
                        if (!dataMap[item.hash + item.timestamp]) {
                            dataMap[item.hash + item.timestamp] = item;
                        }
                    } else {
                        // Process data without key
                        response.data.push(item);
                    }
                }
            );
            Logger.debug(`-- data processing end`);
        }
        if (finalCollection.error) {
            Logger.debug('Error = ' + JSON.stringify(finalCollection.error));

            Logger.debug(`-- error processing start`);
            finalCollection.error.forEach(
                (err: any) => {
                    response.error.push(err);
                }
            );
            Logger.debug(`-- error processing end`);
        }

        Logger.debug(`- acc collection(2) end`);
//        }
        Logger.debug(`Created response = ${JSON.stringify(response)}`);

        if (status === 200 || errorAllowDataPayload === true) {
            // Assets data
            Logger.debug(`- dataMap keys - start`);
            const keys = Object.keys(dataMap);
            if (keys.length > 0) {
                for (let key of Object.keys(dataMap)) {
                    response.data.push(dataMap[key]);
                }
            }
            Logger.debug(`- dataMap keys - end`);
            Logger.debug(`- Bottleneck - start`);
            // response.data = response.data.reduce(Response.distinctObjects, []);
            Logger.debug(`- Bottleneck - end`);

            if (!returnArray) {
                response.data = response.data[0];
            }
        }

        if (status === 200) {
            delete response.error;
        } else {
            if (errorAllowDataPayload === false || response.data.length === 0) {
                delete response.data;
            }
            response.error = response.error.filter(Response.distinct);
        }
        Logger.debug(`Response object after cleanup = ${JSON.stringify(response)}`);

        return response;
    }

    /**
     * Decide which status code of accs will be use for the response
     * @static
     * @param statuses
     */
    static resolveStatus(statuses: any) {
        let acc = {
            critical: false,
            status: statuses.length < 1? 200: 500
        };

        acc = statuses.reduce(
            (acc: any, status: number) => {
                if (status !== 200 && status !== 404) {
                    acc.critical = true;
                    acc.status = status;
                } else if (!acc.critical && status !== acc.status) {
                    if (!(acc.status === 200 && status === 404)) {
                        acc.status = status;
                    }
                }

                return acc;
            }, acc
        );

        return acc.status;
    }

    /**
     * Return values of given column from given array
     * @static
     * @param array
     * @param columnName
     */
    static arrayColumn(array: any, columnName: any) {
        return array.map(function(value: any, index: any) {
            return value[columnName];
        });
    }

    /**
     * Check if object given is included in given array
     * @static
     * @param array
     * @param object
     */
    static isInArray(array: Array<any>, object: any) {
        const hash = JSON.stringify(object);
        const index = array.findIndex(
            (item) => JSON.stringify(item) === hash
        );

        return (index > -1);
    }

    /**
     * Filter distinct objects
     * @static
     * @param acc
     * @param object
     * @param index
     */
    static distinctObjects(acc: any, object: any, index: any) {
        if (!Response.isInArray(acc, object)) {
            acc.push(object);
        }

        return acc;
    }

    /**
     * Check if child is included in given array
     * @static
     * @param array
     * @param object
     */
    static isChildInArray(array: Array<any>, object: any) {
        const index = array.findIndex(
            (item) => item.serialNumberCustomer === object.serialNumberCustomer
        );

        return (index > -1);
    }

    /**
     * Filter distinct children
     * @static
     * @param acc
     * @param object
     * @param index
     */
    static distinctChildren(acc: any, object: any, index: any) {
        if (!Response.isChildInArray(acc, object)) {
            acc.push(object);
        }

        return acc;
    }

    /**
     * Filter distinct value
     * @static
     * @param value
     * @param index
     * @param self
     */
    static distinct(value: any, index: any, self: any) {
        return self.indexOf(value) === index;
    }

}
