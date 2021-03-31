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

import Response from './Response';

describe('ResponseX Unit Tests', () => {

    const errorCode = 404;
    const successCode = 200;

    const payload = {
        key: 'value'
    };

    const json = JSON.parse(JSON.stringify(payload));

    const successResponse = {
        data: json,
        status: successCode
    };

    const errorResponse = {
        error: json,
        status: errorCode
    };

    test('test of success response object creation', () => {
        expect(Response.successObject(json, successCode)).toStrictEqual(successResponse);
    });

    test('test of error response object creation', () => {
        expect(Response.errorObject(json, errorCode)).toStrictEqual(errorResponse);
    });

    test('test of response object preparation', () => {
        expect(Response.prepareObject(json, successCode)).toStrictEqual(successResponse);
        expect(Response.prepareObject(json, errorCode)).toStrictEqual(errorResponse);
    });

    test('Test of same data without children from two channels, returned as array', async () => {
        const acc: any = [
            {
                status: 200,
                data: [
                    {
                        serialNumberCustomer: 'SNM123456'
                    },
                    {
                        serialNumberCustomer: 'SNM789012'
                    }
                ],
            },
            
            {
                status: 200,
                data: [
                    {
                        serialNumberCustomer: 'SNM123456'
                    },
                    {
                        serialNumberCustomer: 'SNM789012'
                    }
                ],
            }
            
        ];

        const processedResponse = await Response.processResponse(acc, true);
        const expectedResponse = {
            status: 200,
            data: [
                {
                    serialNumberCustomer: 'SNM123456'
                },
                {
                    serialNumberCustomer: 'SNM789012'
                }
            ],
            resultLength: 4
        };

        expect(processedResponse).toStrictEqual(expectedResponse);
    });

    test('Test of same data with children from two channels, returned as array', async () => {
        const acc: any = [
            {
                status: 200,
                data: [
                    {
                        serialNumberCustomer: 'SNM123456',
                        childComponents: [
                            {serialNumberCustomer: 'Child123456'}
                        ]
                    },
                    {
                        serialNumberCustomer: 'SNM789012',
                        childComponents: [
                            {serialNumberCustomer: 'Child789012'}
                        ]
                    }
                ]
            },
            {
                status: 200,
                data: [
                    {
                        serialNumberCustomer: 'SNM123456',
                        childComponents: [
                            {serialNumberCustomer: 'Child123456'}
                        ]
                    },
                    {
                        serialNumberCustomer: 'SNM789012',
                        childComponents: [
                            {serialNumberCustomer: 'Child789012'}
                        ]
                    }
                ]
            }
        ];

        const processedResponse = await Response.processResponse(acc, true);
        const expectedResponse = {
            status: 200,
            data: [
                {
                    serialNumberCustomer: 'SNM123456',
                    childComponents: [
                        {serialNumberCustomer: 'Child123456'}
                    ]
                },
                {
                    serialNumberCustomer: 'SNM789012',
                    childComponents: [
                        {serialNumberCustomer: 'Child789012'}
                    ]
                }
            ],
            resultLength: 4
        };

        expect(processedResponse).toStrictEqual(expectedResponse);
    });

    test('Test of same data with different children from two channels, returned as array', async () => {
        const acc: any = [
            {
                status: 200,
                data: [
                    {
                        serialNumberCustomer: 'SNM123456',
                        childComponents: [
                            {serialNumberCustomer: 'Child123456'}
                        ]
                    },
                    {
                        serialNumberCustomer: 'SNM789012',
                        childComponents: [
                            {serialNumberCustomer: 'Child789012'}
                        ]
                    }
                ]
            },
            {
                status: 200,
                data: [
                    {
                        serialNumberCustomer: 'SNM123456',
                        childComponents: [
                            {serialNumberCustomer: 'ABCDEFG000'}
                        ]
                    },
                    {
                        serialNumberCustomer: 'SNM789012',
                        childComponents: [
                            {serialNumberCustomer: '9090283803'}
                        ]
                    }
                ]
            }
        ];

        const processedResponse = await Response.processResponse(acc, true);
        const expectedResponse = {
            status: 200,
            data: [
                {
                    serialNumberCustomer: 'SNM123456',
                    childComponents: [
                        {serialNumberCustomer: 'Child123456'},
                        {serialNumberCustomer: 'ABCDEFG000'}
                    ]
                },
                {
                    serialNumberCustomer: 'SNM789012',
                    childComponents: [
                        {serialNumberCustomer: 'Child789012'},
                        {serialNumberCustomer: '9090283803'}
                    ]
                }
            ],
            resultLength: 4
        };

        expect(processedResponse).toStrictEqual(expectedResponse);
    });

    test('Test of same data with different (and one duplicity) children from two channels, returned as object', async () => {
        const acc: any = [
            {
                status: 200,
                data: {
                    serialNumberCustomer: 'SNM123456',
                    childComponents: [
                        {serialNumberCustomer: 'Child123456'},
                        {serialNumberCustomer: 'Child789012'}
                    ]
                }
            },
            {
                status: 200,
                data: {
                    serialNumberCustomer: 'SNM123456',
                    childComponents: [
                        {serialNumberCustomer: 'ABCDEFG000'},
                        {serialNumberCustomer: '9090283803'},
                        {serialNumberCustomer: 'Child789012'}
                    ]
                }
            }
        ];

        const processedResponse = await Response.processResponse(acc, false);
        const expectedResponse = {
            status: 200,
            resultLength: 2,
            data:  {
                serialNumberCustomer: 'SNM123456',
                childComponents: [
                    {serialNumberCustomer: 'Child123456'},
                    {serialNumberCustomer: 'Child789012'},
                    {serialNumberCustomer: 'ABCDEFG000'},
                    {serialNumberCustomer: '9090283803'},
                ],
            }
        };

        expect(processedResponse).toStrictEqual(expectedResponse);
    });

    test('test of response processing with no-asset data payload', async () => {
        const acc: any = [
            {
                status: 200,
                data: [
                    {
                        "action": "create",
                        "timestamp": "2019-08-24 09:35:37",
                        "userID": "9c7e1d9b-6602-4505-9164-d4dfb81524e0",
                        "hash": "BVU530oLgExYyvRsDNKUGvENZME5Xd2OULX1XZRYQeY="
                    },
                    {
                        "action": "create",
                        "timestamp": "2019-08-24 09:35:37",
                        "userID": "9c7e1d9b-6602-4505-9164-d4dfb81524e0",
                        "hash": "BVU530oLgExYyvRsDNKUGvENZME5Xd2OULX1XZRYQeY="
                    },
                    {
                        "action": "update",
                        "timestamp": "2019-08-24 09:36:20",
                        "userID": "9c7e1d9b-6602-4505-9164-d4dfb81524e0",
                        "hash": "IFQCxvaz/ov5cOSK5Ab+crbFCYIfxPaVNYLMm2whU4Q="
                    }
                ]
            },
            {
                status: 404,
                error: [
                    'Asset with key "SNM123456" does not exist.'
                ]
            }
        ];

        const processedResponse = await Response.processResponse(acc, true);
        const expectedResponse = {
            status: 200,
            resultLength: 3,
            data: [
                {
                    "action": "create",
                    "timestamp": "2019-08-24 09:35:37",
                    "userID": "9c7e1d9b-6602-4505-9164-d4dfb81524e0",
                    "hash": "BVU530oLgExYyvRsDNKUGvENZME5Xd2OULX1XZRYQeY="
                },
                {
                    "action": "update",
                    "timestamp": "2019-08-24 09:36:20",
                    "userID": "9c7e1d9b-6602-4505-9164-d4dfb81524e0",
                    "hash": "IFQCxvaz/ov5cOSK5Ab+crbFCYIfxPaVNYLMm2whU4Q="
                }
            ]
        };

        expect(processedResponse).toStrictEqual(expectedResponse);
    });

   test('test of response processing with given input codes 404 and 400', async () => {
       const acc: any = [
           {
               status: 404,
               error: [
                   'Asset with key "SNM123456" does not exist.'
               ]
           },
           {
               status: 400,
               error: [
                   'Asset with key "SNM123456" is already assigned.'
               ]
           }
       ];

       const processedResponse = await Response.processResponse(acc, true);
       const expectedResponse = {
           status: 400,
           resultLength:0,
           error: [
               'Asset with key "SNM123456" is already assigned.'
           ]
       };

       expect(processedResponse).toStrictEqual(expectedResponse);
    });

    test('test of response processing with given input codes 404 and 200', async () => {
        const acc: any = [
            {
                status: 200,
                data: {
                    serialNumberCustomer: 'SNM123456',
                    childComponents: [
                        {serialNumberCustomer: 'Child123456'},
                        {serialNumberCustomer: 'ABCDEFG000'}
                    ]
                },
            },
            {
                status: 404,
                error: [
                    'Asset with key "SNM123456" does not exist.'
                ]
            }
        ];

        const processedResponse = await Response.processResponse(acc, false);
        const expectedResponse = {
            status: 200,
            resultLength: 1,
            data: {
                serialNumberCustomer: 'SNM123456',
                childComponents: [
                    {serialNumberCustomer: 'Child123456'},
                    {serialNumberCustomer: 'ABCDEFG000'}
                ],
            }
        };

        expect(processedResponse).toStrictEqual(expectedResponse);
    });

    test('test of response processing with given input codes 200 and 400 with allowed data payload for error', async () => {
        const acc: any = [
            {
                status: 200,
                data: [
                    {
                        serialNumberCustomer: 'SNM999999',
                        childComponents: [
                            {serialNumberCustomer: 'Child123456'},
                            {serialNumberCustomer: 'ABCDEFG000'}
                        ]
                    }
                ]
            },
            {
                status: 400,
                error: [
                    'Asset with key "SNM123456" is already assigned.'
                ]
            }
        ];

        const processedResponse = await Response.processResponse(acc, true, undefined, true);
        const expectedResponse = {
            status: 400,
            error: [
                'Asset with key "SNM123456" is already assigned.'
            ],
            data: [
                {
                    serialNumberCustomer: 'SNM999999',
                    childComponents: [
                        {serialNumberCustomer: 'Child123456'},
                        {serialNumberCustomer: 'ABCDEFG000'}
                    ]
                }
            ],
            resultLength: 1
        };

        expect(processedResponse).toStrictEqual(expectedResponse);
    });

    test('test of response processing with given input codes 200 and 400', async () => {
        const acc: any = [
            {
                status: 200,
                data: {
                    isAvailable: true
                },
            },
            {
                status: 400,
                error: [
                    'Asset with key "SNM123456" is already assigned.'
                ]
            }
        ];

        const processedResponse = await Response.processResponse(acc, true);
        const expectedResponse = {
            status: 400,
            resultLength: 0,
            error: [
                'Asset with key "SNM123456" is already assigned.'
            ]
        };

        expect(processedResponse).toStrictEqual(expectedResponse);
    });

    test('test of response processing with given input 400 and 400', async () => {
        const acc: any = [
            {
                status: 400,
                error: [
                    'Asset with key "SNM123456" is already assigned.'
                ]
            },
            {
                status: 400,
                error: [
                    'Asset with key "SNM123456" is already assigned.'
                ]
            }
        ];

        const processedResponse = await Response.processResponse(acc, true);
        const expectedResponse = {
            status: 400,
            resultLength: 0,
            error: [
                'Asset with key "SNM123456" is already assigned.'
            ]
        };

        expect(processedResponse).toStrictEqual(expectedResponse);
    });

});

