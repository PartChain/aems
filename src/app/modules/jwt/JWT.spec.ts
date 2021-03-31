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

import JWT from './JWT';
import Logger from './../logger/Logger';
// Turn of default debug logging
Logger.level = 'fatal';

const token = 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ1ZVBzVWFrcjFocEdHbjlidUh6QV9Oc3ZlQTF2MzktQ2ZsQjN0Rno2aU9vIn0.eyJqdGkiOiIxYmNiMDBhNC05ZjI4LTRmMDYtOTMxNy1hNTc0NjkxMTI3NGYiLCJleHAiOjE1NjU5NTA2MTAsIm5iZiI6MCwiaWF0IjoxNTY1OTMyNjEwLCJpc3MiOiJodHRwczovL2F1dGgucGFydGNoYWluLmRldi9hdXRoL3JlYWxtcy9Xb2xmUmVhbG0iLCJhdWQiOiJ1aSIsInN1YiI6Ijk4MjA2MTM5LTY2MTYtNDcxZC1iMmQ3LWVlYWFlYzUyYTZkOSIsInR5cCI6IkJlYXJlciIsImF6cCI6InVpIiwiYXV0aF90aW1lIjowLCJzZXNzaW9uX3N0YXRlIjoiMmM2NDdhZjktZjQzZi00YzNjLTg3Y2YtZGU2ZDliNTZiNjEzIiwiYWNyIjoiMSIsImFsbG93ZWQtb3JpZ2lucyI6WyIqIl0sInJlYWxtX2FjY2VzcyI6eyJyb2xlcyI6WyJhZG1pbiIsInVtYV9hdXRob3JpemF0aW9uIiwid29sZl91c2VyIiwidXNlciJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInBhcnRjaGFpbi1jaGFubmVscyI6IndvbGYtY2hhbm5lbCIsInByZWZlcnJlZF91c2VybmFtZSI6IndvbGYifQ.woer6sOQZZio9GMMNfg8tubs180SV6IcxHwQvPz6rafIaXyatldIwkzCBDRlco9gJUkHaXxE-8uRVAFJ0ohlKKuYc5vdFxcci_SyrBGpufPTMwEB_oGwN1oe8BM8xdJbV_eQytbTGtT9dVRyGiY3xG0EU9p39B9dyz87f0RSw9P_NmvGS8B7u5ivhcyLRT14PdPSn9XzJ2X5FwuwrLTFXZBm7PfB-RwtlgivPiklxQhhXBaAJKj8AVQFpBp1wB3EO6yqnFpRd5Q0hpkq_vygCfYLl06by908TQA0opjqUcAGVFvVDuoUhRHPGGpeIB_whKROKveJ-7r5R4RLJb30Bg';

const userID = '98206139-6616-471d-b2d7-eeaaec52a6d9';
const channels = ['wolf-channel'];
const issuer = 'https://auth.partchain.dev/auth/realms/WolfRealm';
const realm = 'WolfRealm';

describe('JWT Unit Tests', () => {

    test('parsing token from header', () => {
        const headerUpperCase = `Bearer ${token}`;
        const headerLowerCase = `bearer ${token}`;
        expect(JWT.parseFromHeader(headerUpperCase)).toBe(token);
        expect(JWT.parseFromHeader(headerLowerCase)).toBe(token);
    });

    test('parsing user ID from header', () => {
        const headerUpperCase = `Bearer ${token}`;
        const headerLowerCase = `bearer ${token}`;
        expect(JWT.parseUserIDFromHeader(headerUpperCase)).toBe(userID);
        expect(JWT.parseUserIDFromHeader(headerLowerCase)).toBe(userID);
    });

    test('parsing user ID from token', () => {
        expect(JWT.parseUserIDFromToken(token)).toBe(userID);
    });

    test('decoding of token', () => {
        expect(typeof JWT.decode(token) === 'object').toBe(true);
    });

    test('parsing permitted channel list', () => {
        expect(JWT.getPermittedChannelList(token)).toStrictEqual(channels);
    });

    test('parsing issuer', () => {
        expect(JWT.parseIssuerFromToken(token)).toStrictEqual(issuer);
    });

    test('parsing realm', () => {
        expect(JWT.parseRealmFromToken(token)).toStrictEqual(realm);
    });

});
