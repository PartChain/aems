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
 *
 */
export const SNAKE_CASE_SEPARATOR = '_';

/**
 *
 */
export const KEBAB_CASE_SEPARATOR = '-';

/**
 *
 */
export const BLANK_STRING = '';

/**
 *
 */
export const SPACE = ' ';

/**
 * String operations class
 * @class Strings
 * @module Mapper
 */
export default class Strings {

    /**
     * @static
     * @param string
     */
    static camelCaseToPascalCase(string: string): string {
        return `${string.slice(0, 1).toUpperCase()}${string.slice(1)}`;
    }

    /**
     *
     * @param string
     */
    static camelCaseToSnakeCase(string: string): string {
        return Strings.wordsToSnakeCase(
            Strings.splitByCapital(string)
        );
    }

    /**
     *
     * @param string
     */
    static camelCaseToKebabCase(string: string): string {
        return Strings.wordsToKebabCase(
            Strings.splitByCapital(string)
        );
    }

    /**
     *
     * @param string
     */
    static stringToCamelCase(string: string): string {
        return Strings.wordsToCamelCase(
            Strings.stringToWords(string)
        );
    }

    /**
     *
     * @param words
     */
    static wordsToCamelCase(words: Array<string>) {
        return Strings.wordsToString(
            Strings.wordsToLowerCase(words),
            (acc: string, word: string) => `${acc}${acc ? Strings.capitalize(word) : word}`
        );
    }

    /**
     *
     * @param string
     */
    static pascalCaseToCamelCase(string: string): string {
        return `${string.slice(0, 1).toLowerCase()}${string.slice(1)}`;
    }

    /**
     *
     * @param string
     */
    static pascalCaseToSnakeCase(string: string): string {
        return Strings.wordsToSnakeCase(
            Strings.splitByCapital(string)
        );
    }

    /**
     *
     * @param string
     */
    static pascalCaseToKebabCase(string: string): string {
        return Strings.wordsToKebabCase(
            Strings.splitByCapital(string)
        );
    }

    /**
     *
     * @param string
     */
    static stringToPascalCase(string: string): string {
        return Strings.wordsToPascalCase(
            Strings.stringToWords(string)
        );
    }

    /**
     *
     * @param words
     */
    static wordsToPascalCase(words: Array<string>): string {
        return Strings.wordsToString(
            Strings.wordsToLowerCase(words),
            (acc: string, word: string) => `${acc}${Strings.capitalize(word)}`
        );
    }

    /**
     *
     * @param string
     */
    static snakeCaseToCamelCase(string: string): string {
        return Strings.wordsToCamelCase(
            Strings.stringToWords(string, SNAKE_CASE_SEPARATOR)
        );
    }

    /**
     *
     * @param string
     */
    static snakeCaseToPascalCase(string: string): string {
        return Strings.wordsToPascalCase(
            Strings.stringToWords(string, SNAKE_CASE_SEPARATOR)
        );
    }

    /**
     *
     * @param string
     */
    static snakeCaseToKebabCase(string: string): string {
        return string.replace(/_/g, KEBAB_CASE_SEPARATOR);
    }

    /**
     *
     * @param string
     */
    static stringToSnakeCase(string: string): string {
        return Strings.wordsToSnakeCase(
            Strings.stringToWords(string)
        );
    }

    /**
     *
     * @param words
     */
    static wordsToSnakeCase(words: Array<string>): string {
        return Strings.wordsToString(
            Strings.wordsToLowerCase(words), SNAKE_CASE_SEPARATOR
        );
    }

    /**
     *
     * @param string
     */
    static kebabCaseToCamelCase(string: string): string {
        return Strings.wordsToCamelCase(
            Strings.stringToWords(string, KEBAB_CASE_SEPARATOR)
        );
    }

    /**
     *
     * @param string
     */
    static kebabCaseToPascalCase(string: string): string {
        return Strings.wordsToPascalCase(
            Strings.stringToWords(string, KEBAB_CASE_SEPARATOR)
        );
    }

    /**
     *
     * @param string
     */
    static kebabCaseToSnakeCase(string: string): string {
        return string.replace(/-/g, SNAKE_CASE_SEPARATOR);
    }

    /**
     *
     * @param string
     */
    static stringToKebabCase(string: string): string {
        return Strings.wordsToKebabCase(
            Strings.stringToWords(string)
        );
    }

    /**
     *
     * @param words
     */
    static wordsToKebabCase(words: Array<string>): string {
        return Strings.wordsToString(
            Strings.wordsToLowerCase(words), KEBAB_CASE_SEPARATOR
        );
    }

    /**
     *
     * @param string
     * @param separator
     */
    static stringToWords(string: string, separator: any = SPACE): Array<string> {
        return string.toLowerCase().split(separator).filter((word: string) => word.trim() !== BLANK_STRING);
    }

    /**
     *
     * @param string
     */
    static stringToLetters(string: string): Array<string> {
        return string.split(BLANK_STRING);
    }

    /**
     *
     * @param words
     * @param separator
     */
    static wordsToString(words: Array<string>, separator: any) {
        if (typeof separator === "function") {
            return words.reduce(separator, BLANK_STRING);
        }
        return words.join(separator);
    }

    /**
     *
     * @param words
     */
    static wordsToLowerCase(words: Array<string>): Array<string> {
        return words.map(
            (word: string) => word.toLowerCase()
        );
    }

    /**
     *
     * @param word
     */
    static wordToLowerCase(word: string): string {
        return word.toLowerCase();
    }

    /**
     *
     * @param string
     */
    static capitalize(string: string) {
        return `${string.slice(0, 1).toUpperCase()}${string.slice(1)}`;
    }

    /**
     *
     * @param string
     */
    static isCapital(string: string) {
        return string === string.toUpperCase();
    }

    /**
     *
     * @param string
     */
    static splitByCapital(string: string): Array<string> {
        return Strings.stringToLetters(string).reduce(
            (acc: Array<string>, letter: string) => {
                if (Strings.isCapital(letter) || acc.length === 0) {
                    acc.push(letter);
                } else {
                    acc[acc.length - 1] = `${acc[acc.length - 1]}${letter}`;
                }
                return acc;
            },
            []
        );
    }

    static getKeyFromMessage(message: string) {
        const key = message.match(/"(.*)"/gm);

        if (key) {
            return String(key).split('"').join('');
        }

        return key;
    }

}
