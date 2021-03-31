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
 * @class DateCreator
 * @module DateCreator
 */
export default class DateCreator {

    static getToday() {
        let today = new Date();
        let tomorrow = new Date(today.setDate(today.getDate() + 1)) //Use tomorrow instead of today bc the filter query will exclude today from query range
        return tomorrow.getFullYear() + '-' + String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + String(tomorrow.getDate()).padStart(2, '0');
    }

    static getBeginningDate(duration: string) {
        let today = new Date();
        let beginningDate: string;

        switch(duration) {
        case 'year':
            beginningDate = today.getFullYear() + '-' + '01' + '-' + '01';
            return beginningDate;
        case 'month':
            beginningDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + '01';
            return beginningDate;
        case 'week':
            let mondayDate = this.getMonday(today);
            beginningDate = mondayDate.getFullYear() + '-' + String(mondayDate.getMonth() + 1).padStart(2, '0') + '-' + String(mondayDate.getDate()).padStart(2, '0');
            return beginningDate;
        case 'day': 
            let yesterday = this.getYesterday(today);
            beginningDate = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0')
            return beginningDate;
        
        }
    }

    private static getMonday(today:Date){
            let day = today.getDay(),
                diff = today.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
            return new Date(today.setDate(diff));
          }

    private static getYesterday(today:Date){
        return new Date(today.setDate(today.getDate() - 1));
    }

}