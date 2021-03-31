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

import { Router as ExpressRouter } from 'express';
import Routes from './../../interfaces/Routes';
import Route from "./../../interfaces/Route";
import {REQUEST_TYPE} from '../route/route'

export default class Router {

    /**
     *
     */
    authProvider: any;

    /**
     *
     */
    router: ExpressRouter;

    /**
     *
     */
    routes: Routes;

    /**
     *
     * @param routes
     * @param authProvider
     */
    constructor(routes: Routes, authProvider: any) {
        this.routes = routes;
        this.authProvider = authProvider;
        this.router = ExpressRouter();
        this.registerRoutes(routes);
    }

    /**
     *
     */
    get middleware() {
        return this.router;
    }

    /**
     *
     */
    get data() {
        return this.routes.data;
    }

    /**
     *
     */
    get pathPrefix() {
        return this.routes.pathPrefix;
    }

    /**
     *
     * @param routes
     */
    registerRoutes(routes: Routes) {
        routes.data.forEach(
            route => this.registerRoute(route)
        );
    }

    /**
     *
     * @param route
     */
    registerRoute(route: Route) {
        if (!route.type) {
            route.type = REQUEST_TYPE.GET;
        }

        if (route.protected) {
            route.middleware = this.authMiddleware(route.protected);
        }

        switch(route.type.toLowerCase()) {
            case REQUEST_TYPE.POST:
                this.router.post(
                    this.getRouteFullPath(route.path),
                    !!route.middleware ? [ route.middleware ] : [],
                    route.action
                );
                break;
            case REQUEST_TYPE.GET:
            default:
                this.router.get(
                    this.getRouteFullPath(route.path),
                    !!route.middleware ? [ route.middleware ] : [],
                    route.action
                );
                break;
        }
    }

    /**
     *
     * @param path
     */
    getRouteFullPath(path: string): string {
        return !!this.pathPrefix ? `/${this.pathPrefix}/${path}` : `/${path}` ;
    }

    /**
     *
     * @param role
     */
    authMiddleware(role: any): any {
        return this.authProvider.protect(role);
    }

}
