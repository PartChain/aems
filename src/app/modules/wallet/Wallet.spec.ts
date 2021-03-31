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

import Wallet from './Wallet';
import Logger from './../logger/Logger';
// Turn of default debug logging
Logger.level = 'fatal';

describe('Wallet Unit Tests', () => {

    const signCert = '-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQglZZ9ju1faQIDHS1z\nptrjLStJl6H1f9f92XfLLCG9lK6hRANCAATqpPwY4X4duFPoJ5m3nxQftdngamET\nHxODmqve+q2e8nZ9wRyXQ/zSh27e3T6Jw9NDrMwcWjfF+AyDiDUjs1A4\n-----END PRIVATE KEY-----\n'
    const keyFile = '-----BEGIN CERTIFICATE-----\nMIICOTCCAeCgAwIBAgIRALikOTJcO17GuKN/oyj/MYowCgYIKoZIzj0EAwIwfTEL\nMAkGA1UEBhMCVVMxEzARBgNVBAgTCkNhbGlmb3JuaWExFjAUBgNVBAcTDVNhbiBG\ncmFuY2lzY28xHjAcBgNVBAoTFWJtdy5zdmMuY2x1c3Rlci5sb2NhbDEhMB8GA1UE\nAxMYY2EuYm13LnN2Yy5jbHVzdGVyLmxvY2FsMB4XDTE5MDgwNjE1MDQwMFoXDTI5\nMDgwMzE1MDQwMFowcTELMAkGA1UEBhMCVVMxEzARBgNVBAgTCkNhbGlmb3JuaWEx\nFjAUBgNVBAcTDVNhbiBGcmFuY2lzY28xDzANBgNVBAsTBmNsaWVudDEkMCIGA1UE\nAwwbVXNlcjFAYm13LnN2Yy5jbHVzdGVyLmxvY2FsMFkwEwYHKoZIzj0CAQYIKoZI\nzj0DAQcDQgAE6qT8GOF+HbhT6CeZt58UH7XZ4GphEx8Tg5qr3vqtnvJ2fcEcl0P8\n0odu3t0+icPTQ6zMHFo3xfgMg4g1I7NQOKNNMEswDgYDVR0PAQH/BAQDAgeAMAwG\nA1UdEwEB/wQCMAAwKwYDVR0jBCQwIoAgN6wZcJojln0OcQkaRR0knce3kbmTVz5C\njtHn+BLdta4wCgYIKoZIzj0EAwIDRwAwRAIgc6W1DOL5sRjZhPXL0il4cjDCTDBy\nCYS8ZmdHWrvgDZ4CIGg187HvSt2VnNiNuRHbOvxT40b6ck49oIVaG5UkQbOG\n-----END CERTIFICATE-----\n'

    test('Wallet', () => {
        expect(true).toBe(true);
    });
});
