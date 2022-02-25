# Customer CLI

Customer CLI is a tool to sync user data from local files to the Customer.io API.

<br/>

## Running

- `npm install` to install dependencies.
- `node index.js ${CONFIG_PATH} ${DATA_PATH}` to run script.

<br/>

## Dependencies

Customer CLI uses Bluebird and Node-fetch dependencies.

#### Bluebird
- Primarily used Bluebird for its implementation of `Promise.map()`, which has built in concurrency coordination, limiting the number of Promises created ([docs/api/promise.map.html](http://bluebirdjs.com/docs/api/promise.map.html)).

#### Node-fetch
- Node-fetch is to make PUT request to Customer.io API endpoint.

<br/>

## Product Question

#### Implementing an update only flag
The Customer.io API currently supports the ability to update attributes on existing users without creating a new user. This is via the `_update` property on the `/api/v1/customers/{identifier}` endpoint ([docs/api/#operation/identify](https://www.customer.io/docs/api/#operation/identify)). 

#### Hackiness scale: 1 out of 10
An `_update: BOOL` property would need to be added into the `config.json`, which would then be passed into the body.

#### Edge cases 
There are very few edge cases for this solution. 

The approach of adding the `_update` property into the `config.json` only works if the company wants the same behavior for all users in the `data.json`. If they want to update certain users and add others, the property would need to be added on a per user basis.
