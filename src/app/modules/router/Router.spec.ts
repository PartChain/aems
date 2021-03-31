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

import Router from './Router';
import Logger from './../logger/Logger';
import route from "../route/route";
// Turn of default debug logging
Logger.level = 'fatal';

describe('Router Unit Tests', () => {

    const routeAction = () => true;

    const routes = {
        pathPrefix: 'prefix',
        data: [
            route('test', routeAction),
            route('test-2', routeAction)
        ]
    };

    const additionalRoute = route('test-3', routeAction);

    const extendedRoutes = routes.data.concat([ additionalRoute ]);

    const authProviderStub = {
        protect: () => true
    };

    const router = new Router(routes, authProviderStub);

    test('get path prefix', () => {
        expect(router.pathPrefix).toBe(routes.pathPrefix);
    });

    test('get router data => routes', () => {
        expect(router.data).toBe(routes.data);
    });

    test('get route full path', () => {
        expect(router.getRouteFullPath(routes.data[0])).toBe(`/${routes.pathPrefix}/${routes.data[0]}`);
    });

    test('test auth provider', () => {
        expect(router.authMiddleware(true)).toBe(true);
    });

    test('routes register procedure from constructor', () => {
        router.router.stack.forEach(
            (route: any, key: number) => {
                expect(route.route.path).toBe(`/${routes.pathPrefix}/${routes.data[key].path}`);
            }
        );
    });

    test('routes register procedure from register routes action', () => {
        router.registerRoute(additionalRoute);
        router.router.stack.forEach(
            (route: any, key: number) => {
                expect(route.route.path).toBe(`/${routes.pathPrefix}/${extendedRoutes[key].path}`);
            }
        );
    });

});
