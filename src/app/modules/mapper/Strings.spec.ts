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

import Strings from "./Strings";

describe('String Mapper Unit Tests', () => {

    /**
     * Definitions
     */
    const string = 'This is nOrmal stRing';
    const words = ['This', 'is', 'nOrmal', 'stRing'];
    const camelCase = 'thisIsNormalString';
    const pascalCase = 'ThisIsNormalString';
    const snakeCase = 'this_is_normal_string';
    const kebabCase = 'this-is-normal-string';

    /**
     * Camel case
     */
    test('conversion of string to camel case string', () => {
        expect(Strings.stringToCamelCase(string)).toBe(camelCase);
    });

    test('conversion of array of words to camel case string', () => {
        expect(Strings.wordsToCamelCase(words)).toBe(camelCase);
    });

    test('conversion of pascal case string to camel case string', () => {
        expect(Strings.pascalCaseToCamelCase(pascalCase)).toBe(camelCase);
    });

    test('conversion of snake case string to camel case string', () => {
        expect(Strings.snakeCaseToCamelCase(snakeCase)).toBe(camelCase);
    });

    test('conversion of kebab case string to camel case string', () => {
        expect(Strings.kebabCaseToCamelCase(kebabCase)).toBe(camelCase);
    });

    /**
     * Pascal case
     */

    test('conversion of string to pascal case string', () => {
        expect(Strings.stringToPascalCase(string)).toBe(pascalCase);
    });

    test('conversion of array of words to pascal case string', () => {
        expect(Strings.wordsToPascalCase(words)).toBe(pascalCase);
    });

    test('conversion of camel case string to pascal case string', () => {
        expect(Strings.camelCaseToPascalCase(camelCase)).toBe(pascalCase);
    });

    test('conversion of snake case string to pascal case string', () => {
        expect(Strings.snakeCaseToPascalCase(snakeCase)).toBe(pascalCase);
    });

    test('conversion of kebab case string to pascal case string', () => {
        expect(Strings.kebabCaseToPascalCase(kebabCase)).toBe(pascalCase);
    });

    /**
     * Snake case
     */

    test('conversion of string to snake case string', () => {
        expect(Strings.stringToSnakeCase(string)).toBe(snakeCase);
    });

    test('conversion of array of words to camel snake string', () => {
        expect(Strings.wordsToSnakeCase(words)).toBe(snakeCase);
    });

    test('conversion of camel case string to snake case string', () => {
        expect(Strings.camelCaseToSnakeCase(camelCase)).toBe(snakeCase);
    });

    test('conversion of pascal case string to snake case string', () => {
        expect(Strings.pascalCaseToSnakeCase(pascalCase)).toBe(snakeCase);
    });

    test('conversion of kebab case string to snake case string', () => {
        expect(Strings.kebabCaseToSnakeCase(kebabCase)).toBe(snakeCase);
    });

    /**
     * Kebab case
     */

    test('conversion of string to kebab case string', () => {
        expect(Strings.stringToKebabCase(string)).toBe('this-is-normal-string');
    });

    test('conversion of array of words to camel kebab string', () => {
        expect(Strings.wordsToKebabCase(words)).toBe('this-is-normal-string');
    });

    test('conversion of camel case string to kebab case string', () => {
        expect(Strings.camelCaseToKebabCase(camelCase)).toBe(kebabCase);
    });

    test('conversion of pascal case string to kebab case string', () => {
        expect(Strings.pascalCaseToKebabCase(pascalCase)).toBe(kebabCase);
    });

    test('conversion of snake case string to kebab case string', () => {
        expect(Strings.snakeCaseToKebabCase(snakeCase)).toBe(kebabCase);
    });

});


