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

import * as express from 'express';
import * as compression from 'compression';
import * as cors from 'cors';
import * as session from 'express-session';
import * as bodyParser from 'body-parser';
const KeycloakMultirealm = require('keycloak-connect-multirealm');

import Routes from "./interfaces/Routes";
import Logger from './modules/logger/Logger';
import Options from "./interfaces/Options";
import Router from "./modules/router/Router";
import Config, { Config as ConfigType } from "./modules/config/Config";
import defaults from "./defaults";
import Objects from "./modules/mapper/Objects";

/**
 * Express server abstraction
 * @class Server
 * @export Server
 */
export default class Server {

    /**
     * Express instance
     * @type express.Application
     */
    protected app: express.Application;

    /**
     * Auth provider instance
     * @type Keycloak
     */
    protected authProvider: any;

    /**
     * Server configuration object
     * @type ConfigType
     */
    protected options: ConfigType;

    /**
     * Server routes
     * @type Routes[]
     */
    protected routes: Routes[];

    /**
     * Session storage
     * @type session.MemoryStore
     */
    protected session: session.MemoryStore;

    /**
     * @constructor Server
     */
    constructor(options: Options) {
        Server.loadEnvironmentVariables();
        this.validateDefaults();
        this.initConfig(options);
        this.initApp();
        this.cors();
        this.enableCompression();
        this.parseJSONBody();
        this.parseQueryString();
        this.initAuthProvider();
        this.initAuthMiddleware();
        this.assignRoutes(this.routes);
        this.publishDocs();
        this.publishSwagger();
    }

    /**
     * Load environment variables
     */
    static loadEnvironmentVariables(): void {
        if (process.env.APP_MODE && process.env.APP_MODE === 'development') {
            const dotEnv = require('dotenv');
            dotEnv.config();
            Logger.debug(`Server is using local .env file`);
        }
    }

    /**
     * Initialize server configuration
     * @param options
     */
    initConfig(options: Options): void {
        this.options = Config.merge(options, require('./defaults').default);
        this.routes = options.routes;
    }

    /**
     * Initialize Express class
     */
    initApp(): void {
        this.app = express();
    }

    /**
     * Initialize Express class
     */
    validateDefaults(): void {
        Logger.info("Validating Defaults now");
        Objects.checkForEmptyPropertiesInObject(defaults);
    }

    /**
     * Initialize CORS configuration
     */
    cors(): void {
        if (this.getOption('cors')) {
            this.app.use(
                cors(require('./cors').default)
            );
            Logger.debug(`Server CORS is protection enabled`);
        }
    }

    /**
     * Run server and listen on given HTTP port
     */
    listen(): void {
        const server = this.app.listen(this.getOption('port'));
        server.setTimeout(500000);
        Logger.info(`Server is listening on port: ${this.getOption('port')}`);
    }

    /**
     * Parse content of HTTP request body
     */
    parseJSONBody(): void {
        this.app.use(
            bodyParser.json({ limit: '50mb' })
        );

    }

    /**
     * Parse HTTP request query string values
     */
    parseQueryString(): void {
        this.app.use(
            bodyParser.urlencoded({
                limit: '50mb',
                extended: true
            })
        );
    }

    /**
     * Assign router with server
     * @param router
     * @param subPath
     */
    assignRouter(router: express.Router, subPath: string = '/'): void {
        this.app.use(subPath, router);
    }

    /**
     * Register middleware
     * @param middleware
     */
    middleware(middleware: express.Application): void {
        this.app.use(middleware);
    }

    /**
     * Initialize session storage
     */
    initSession(): void {
        this.session = new session.MemoryStore();
    }

    /**
     * Initialize authentication provider
     */
    initAuthProvider(): void {
        const config = {};
        this.authProvider = new KeycloakMultirealm(config);
    }

    /**
     * Initialize authentication provider middleware
     */
    initAuthMiddleware(): void {
        this.app.use(
            this.authProvider.middleware()
        );
    }

    /**
     * Assign routes collection into application instance
     * @param routes
     */
    assignRoutes(routes: Routes[]): void {
        if (!Array.isArray(routes)) {
            routes = [routes];
        }

        routes.forEach(
            (router: any) => {
                const instance = new Router(router, this.authProvider);
                this.assignRouter(instance.middleware);
            }
        );
    }

    /**
     * Publish API reference documentation on given path
     */
    publishDocs(): void {
        if (!!this.getOption('docs.enabled')) {
            this.app.use(
                this.getOption('docs.path'),
                express.static(
                    this.getOption('docs.rootFolder')
                )
            );

            Logger.info(`Server has published API reference of following path: ${this.getOption('docs.path')}`);
        }
    }

    /**
     * Publish Swagger documentation on given path
     */
    publishSwagger(): void {
        if (!!this.getOption('swagger.enabled')) {
            const swaggerJSDoc = require('swagger-jsdoc');
            const swaggerUi = require('swagger-ui-express');

            const swaggerDefinition = this.getSwaggerDefinition();
            const swaggerApis = this.getOption('swagger.apis');
            const swaggerSpec = swaggerJSDoc({
                swaggerDefinition, apis: swaggerApis
            });

            this.app.use(
                this.getOption('swagger.path'),
                swaggerUi.serve,
                swaggerUi.setup(swaggerSpec)
            );

            Logger.info(`Server has published API swagger of following path: /api-docs/swagger`);
        }
    }

    /**
     * Get Swagger definition file path
     */
    getSwaggerDefinition(): object {
        return this.getOption('swagger');
    }

    /**
     * Get configuration option by given key
     * @param key
     */
    getOption(key: string) {
        return this.options.getOption(key);
    }

    /**
     * Enable output compression
     */
    enableCompression(): void {
        if (this.getOption('compression')) {
            this.app.use(
                compression()
            );
            Logger.debug(`Server output compression is enabled`);
        }
    }

}
