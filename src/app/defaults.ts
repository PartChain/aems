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
 * Default configuration map
 * @export object
 */
export default {
    host: process.env.API_HOST ? process.env.API_HOST : 'https://domain.tld',
    port: process.env.API_PORT ? process.env.API_PORT : 8080,
    cors: process.env.API_CORS ? process.env.API_CORS : true,
    compression: process.env.API_COMPRESSION ? process.env.API_COMPRESSION : true,
    loggingLevel: process.env.LOGGING_LEVEL ? process.env.LOGGING_LEVEL : 'info',
    hlfIdentitiesFilePath: process.env.HLF_IDENTITIES_FILE_PATH ? process.env.HLF_IDENTITIES_FILE_PATH : "/aems-hlf-identities/hlf-identities.json",
    hlfDefaultMspID: process.env.HLF_IDENTITY_DEFAULT_MSP_ID ? process.env.HLF_IDENTITY_DEFAULT_MSP_ID : "Lion",
    channelName: process.env.HLF_NETWORK_CHANNEL_NAME ? process.env.HLF_NETWORK_CHANNEL_NAME : "partchain-channel",
    paginationLimit: process.env.HLF_PAGINATION_LIMIT ? Number(process.env.HLF_PAGINATION_LIMIT) : 25,
    postgres: {
        host: process.env.API_DATABASE_HOST,
        name: process.env.API_DATABASE_NAME ? process.env.API_DATABASE_NAME : 'postgres',
        user: process.env.API_DATABASE_USER ? process.env.API_DATABASE_USER : 'postgres',
        password: process.env.API_DATABASE_PASSWORD,

    },
    eventListener: {
        enabled: process.env.EVENT_LISTENER_ENABLED ? (process.env.EVENT_LISTENER_ENABLED === 'true') : true,
    },
    cronjob: {
        enabled: process.env.SCHEDULER_ENABLED ? (process.env.SCHEDULER_ENABLED === 'true') : true,
        status: {
            unknown: {
                limit: process.env.CRONJOB_SCHEDULE_LIMIT_UNKNOWN ? Number(process.env.CRONJOB_SCHEDULE_LIMIT_UNKNOWN) : 50,
                schedule: process.env.CRONJOB_SCHEDULE_STATUS_UNKNOWN ? process.env.CRONJOB_SCHEDULE_STATUS_UNKNOWN : '0 */1 * * * *'
            },
            notInFabric: {
                limit: process.env.CRONJOB_SCHEDULE_LIMIT_NOTINFABRIC ? Number(process.env.CRONJOB_SCHEDULE_LIMIT_NOTINFABRIC) : 150,
                schedule: process.env.CRONJOB_SCHEDULE_STATUS_NOTINFABRIC ? process.env.CRONJOB_SCHEDULE_STATUS_NOTINFABRIC : '15 */5 * * * *'
            },
            childInPublicLedger: {
                limit: process.env.CRONJOB_SCHEDULE_LIMIT_CHILDINPUBLICLEDGER ? Number(process.env.CRONJOB_SCHEDULE_LIMIT_CHILDINPUBLICLEDGER) : 30,
            },
            parentShared: {
                limit: process.env.CRONJOB_SCHEDULE_LIMIT_PARENTSHARED ? Number(process.env.CRONJOB_SCHEDULE_LIMIT_PARENTSHARED) : 100,
                schedule: process.env.CRONJOB_SCHEDULE_STATUS_PARENTSHARED ? process.env.CRONJOB_SCHEDULE_STATUS_PARENTSHARED : '30 */30 * * * *'
            },
            requestAssetNotAllowed: {
                limit: process.env.CRONJOB_SCHEDULE_LIMIT_REQUESTASSETNOTALLOWED ? Number(process.env.CRONJOB_SCHEDULE_LIMIT_REQUESTASSETNOTALLOWED) : 250,
                schedule: process.env.CRONJOB_SCHEDULE_STATUS_REQUESTASSETNOTALLOWED ? process.env.CRONJOB_SCHEDULE_STATUS_REQUESTASSETNOTALLOWED : '45 */30 * * * *'
            },
            getAllActiveInvestigation: {
                limit: process.env.CRONJOB_SCHEDULE_LIMIT_ACTIVEINVESTIGATION ? Number(process.env.CRONJOB_SCHEDULE_LIMIT_ACTIVEINVESTIGATION) : 50,
                schedule: process.env.CRONJOB_SCHEDULE_LIMIT_ACTIVEINVESTIGATION ? process.env.CRONJOB_SCHEDULE_LIMIT_ACTIVEINVESTIGATION : '5 */30 * * * *'
            },
            requestAssetForInvestigation: {
                limit: process.env.CRONJOB_SCHEDULE_LIMIT_REQUESTASSETFORINVESTIGATION ? Number(process.env.CRONJOB_SCHEDULE_LIMIT_REQUESTASSETFORINVESTIGATION) : 50,
                schedule: process.env.CRONJOB_SCHEDULE_LIMIT_REQUESTASSETFORINVESTIGATION ? process.env.CRONJOB_SCHEDULE_LIMIT_REQUESTASSETFORINVESTIGATION : '10 */15 * * * *'
            },
            retryRequestAssetForInvestigation: {
                limit: process.env.CRONJOB_SCHEDULE_LIMIT_RETRYREQUESTASSETFORINVESTIGATION ? Number(process.env.CRONJOB_SCHEDULE_LIMIT_RETRYREQUESTASSETFORINVESTIGATION) : 50,
                schedule: process.env.CRONJOB_SCHEDULE_LIMIT_RETRYREQUESTASSETFORINVESTIGATION ? process.env.CRONJOB_SCHEDULE_LIMIT_RETRYREQUESTASSETFORINVESTIGATION : '15 */30 * * * *'
            }
        }
    },
    kafka: {
        enabled: process.env.KAFKA_ENABLED ? (process.env.KAFKA_ENABLED === 'true') : true,
        host: process.env.KAFKA_HOST ? process.env.KAFKA_HOST : "kafka.org.svc.cluster.local",
        port: process.env.KAFKA_PORT ? Number(process.env.KAFKA_PORT) : 9092,
        groupId: process.env.KAFKA_GROUP_ID ? process.env.KAFKA_GROUP_ID : "AEMS",
    },
    childrenMaxRecursiveLimits: {
        detail: process.env.HLF_CHILDREN_MAX_RECURSIVE_LEVEL_DETAIL ? process.env.HLF_CHILDREN_MAX_RECURSIVE_LEVEL_DETAIL : 1,
        list: process.env.HLF_CHILDREN_MAX_RECURSIVE_LEVEL_LIST ? process.env.HLF_CHILDREN_MAX_RECURSIVE_LEVEL_LIST : 1
    },
    docs: {
        enabled: process.env.API_DOCS_ENABLED ? process.env.API_DOCS_ENABLED : true,
        rootFolder: process.env.API_DOCS_ROOT_FOLDER ? process.env.API_DOCS_ROOT_FOLDER : 'docs',
        path: process.env.API_DOCS_HTTP_PATH ? process.env.API_DOCS_HTTP_PATH : '/api-docs/reference'
    },
    swagger: {
        enabled: process.env.API_SWAGGER_ENABLED ? process.env.API_SWAGGER_ENABLED : true,
        host: process.env.API_HOST ? process.env.API_HOST : 'https://domain.tld',
        openapi: process.env.API_SWAGGER_API_VERSION ? process.env.API_SWAGGER_API_VERSION : '3.0.0',
        basePath: process.env.API_BASE ? process.env.API_BASE : 'v1',
        path: process.env.API_SWAGGER_HTTP_PATH ? process.env.API_SWAGGER_HTTP_PATH : '/api-docs/swagger',
        info: {
            title: process.env.API_SWAGGER_TITLE ? process.env.API_SWAGGER_TITLE : 'PartChain Asset Exchange Service',
            description: process.env.API_SWAGGER_DESCRIPTION
                ? process.env.API_SWAGGER_DESCRIPTION
                : 'API service for exchanging assets via PartChain',
            version: process.env.API_SWAGGER_VERSION ? process.env.API_SWAGGER_VERSION : '1.0.0'
        },
        components: {
            securitySchemes: {
                Bearer: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        apis: []
    }
}
