# PartChain Asset Exchange Service

> __Note:__ This repository is still under active development! Breaking changes are possible, and we are working on improving code quality.

Asset Exchange Application Program Interface. This system handles the storage and exchange of assets between different
Fabric mspIDs in the PartChain ecosystem.

### Scheduler

The scheduler handles the actual data exchange between two parties. For example if you store an asset X with the
componentsSerialNumber Y, it will check whether Y is stored in the ledger. If yes, it will request it, which will
automatically write X into the private data collection of the manufacturer of Y. The relationship between an asset and
its child can therefore be in different status types. There types can be seen
in ```src/app/enums/RelationshipStatusType.ts```.

### Access Management API

The access management endpoints can be used to get the access control list (ACL) of your organisation and update a
relationship between you and a partner.
There are 3 different status types for each relationship:
* ACTIVE: The relationship between these two partner is active and each party can write into the others private data collection.
* PENDING: On party has requested access to another party. The other party has to confirm or deny this request to set the relationship to ACTIVE/INACTIVE.
* INACTIVE: The relationship between these two partner is inactive and neither you nor your partner can write in the private data collection of the other party.

### Smart Contract API
The smart contract endpoints can be used to store or update assets. The children of the assets stored in the componentSerialNumbers then will be picked up by the scheduler which will handle the relationship between the asset and the child.

### Transaction API
The transaction endpoint can be used to create and commit new transactions which can be used to update properties like the qualityStatus of the asset.

## Prerequisites
*   Running Fabric Network
*   Installed according Chaincode in Fabric Network
*   Running PostgreSQL database
*   Running Keycloak 
*   Running Kafka (For ingesting data via kafka)

## API documentation
API documentation is done via swagger.
The swagger can be access for example via https://api.aems.partchain.dev/api-docs/swagger/


## Docker Build process

This application source code is written in Typescript, and it is using [Webpack](https://webpack.js.org/) for conversion to ES5. Output ECMA Script version could be changed in `./tsconfig.json` file. For more information about possible Typescript configuration options please follow this [link](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html).

```bash
$ docker build . -t [image-name]:[image-tag]
```
For example:
 ```bash
docker build --build-arg HTTP_PROXY=$http_proxy --build-arg HTTPS_PROXY=$http_proxy -f ./build/Dockerfile -t link-to-your-registry/asset-exchange-dev-registry:feature .
docker push link-to-your-registry/asset-exchange-dev-registry:feature

```
Remove ```--build-arg HTTP_PROXY=$http_proxy --build-arg HTTPS_PROXY=$http_proxy``` in case you have no proxy.

## Run locally
At the moment there is no tutorial of running this locally. We will try to provide a tutorial in the future.

## Kafka Support
We support the use of Kafka to ingest data to the system. The name of the topic needs to be the mspid, e.g. Lion. 
The AEMS then can consume the assets stored in this topic and calls upsertAsset internally. 
To ingest data into Kafka you can use our Data Integration Service (DIS).

## Environment variables 

| Variable name | Description | Default value |
|:----------|:------|:------|
| API_HOST | Application host name | https://domain.tld |
| API_BASE | API base path prefix | v0 |
| API_PORT | Application port | 8080 |
| API_DATABASE_HOST | API database host name | https://localhost |
| API_DATABASE_NAME | API database name | postgres |
| API_DATABASE_USER | API database user | postgres |
| API_DATABASE_PASSWORD  | API database password |  |
| HLF_CHILDREN_MAX_RECURSIVE_LEVEL_LIST  | Count of loaded children levels for getAssetList action (-1 means infinity) | -1 |
| HLF_CHILDREN_MAX_RECURSIVE_LEVEL_DETAIL  | Count of loaded children levels for getAssetDetail action (-1 means infinity) | -1 |
| HLF_PAGINATION_LIMIT | Count of assets per page | 25 |
| HLF_NETWORK_CHANNEL_NAME | The Fabric Channel to use | wolf-channel |
| HLF_IDENTITIES_FILE_PATH| File containing Fabric credential information | /aems-hlf-identities/hlf-identities.json |
| KEYCLOAK_CONFIG_PATH | Path to file with Keycloak profile | ./build/development/keycloak/lion/keycloak.json |
| LOGGING_LEVEL | Logging level | info |
| KAFKA_ENABLED | variable to en-/disable kafa consumer | true |
| KAFKA_HOST | host name of kafka | partchain-dev-lion-kafka.lion.svc.cluster.local |
| HLF_IDENTITY_DEFAULT_MSP_ID | default mspID of this API | Lion |

This is an excerpt of the used environmental variables. More of them and their default values can be seen in ```src/app/defaults.ts```.


### `hlf-identities.json` example

hlf-identities.json:
```
    {
       "Wolf":{
          "HLF_IDENTITY_CERT_PATH":"signcerts/cert.pem",
          "HLF_IDENTITY_CONFIG_PATH":"./config/crypto-config/peerOrganizations/",
          "HLF_IDENTITY_KEY_PATH":"keystore/1234abcd_sk",
          "HLF_IDENTITY_MSP_ID":"Wolf",
          "HLF_IDENTITY_MSP_PATH":"org1.svc.cluster.local/users/User1@org1.svc.cluster.local/msp",
          "HLF_IDENTITY_USERNAME":"User1",
          "HLF_NETWORK_CHAINCODE_ID":"partchaincct",
          "HLF_NETWORK_PROFILE":"./config/network-profile-org1.yaml"
       }
    }
```

## Authentication
We use keycloak JWT to authenticate against this API. As we support multiple realms for trust as a service, the keycloak.json of the API needs to look like this:
```
{
  "resource": "abstractor",
  "bearer-only": true,
  "auth-server-url": "https://auth.keycloak.tld/auth"
}

```

To identify the correct Hyperledger Fabric identity we need a field called mspid in the JWT token. For example if your fabric mspid is Lion:
```
 "mspid": "Lion",

```

We also experienced that some roles are needed by the keycloak client, for example (maybe less are needed):
```
"realm_access": {
        "roles": [
            "offline_access",
            "wolf_user",
            "uma_authorization",
            "user"
        ]
    },
```


## K8S Deployment process

The recommended way of deploying this service is Kubernetes. 
The Kubernetes deployment can be seen in the respective helm chart in the Platform Repository

# License

[Apache License 2.0](LICENSE)