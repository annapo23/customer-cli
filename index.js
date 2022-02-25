const fetch = require('node-fetch');
const fs = require('fs')
const https = require('https');
const Promise = require('bluebird');

if (process.argv.length !== 4) {
  console.error('Make sure correct number of arguments is passed into script.');
  return;
}

let config;
let data;
try {
  // Read files from passed in arguments
  const configFile = process.argv[2];
  const dataFile = process.argv[3];
  config = JSON.parse(fs.readFileSync(configFile));
  data= JSON.parse(fs.readFileSync(dataFile));
} catch (error) {
  console.error('Make sure file paths are correct.');
  return;
}

const baseUrl = 'https://track.customer.io/api/v1/customers';
let failedPermanentlyArray = [];
let retryArray = [];
let retryCount = 0;
const retryStatusCodes = [
  408, // Request Timeout
  429, // Too Many Requests
  503, // Service Unavailable
  504, // Gateway Timeout
];

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Basic ${Buffer.from(`${config.siteId}:${config.apiKey}`, 'utf8').toString('base64')}`,
};

const httpsAgent = new https.Agent({ keepAlive: true });

const upsertUser = async ({ user }) => {
  const { mappings = [] } = config;
  // Update body from config mappings
  const body = mappings.reduce((acc, mapping) => {
    const { from, to } = mapping; 
    if (acc[from]) {
      delete Object.assign(acc, { [to]: acc[from] })[from];
    }
    acc.update = true;
    return acc;
  }, user);


  const response = await fetch(`${baseUrl}/${user[config.userId]}`, {
    agent: httpsAgent,
    body: JSON.stringify(body),
    headers,
    method: 'PUT',
  })

  const { status } = response || {};
  if (status && status !== 200) {
    if (!retryStatusCodes.includes(status)) {
      // Retry if status is included in retryStatusCodes
      // (i.e. 408: Request Timeout, 429: Too Many Requests, 503: Service Unavailable, 504: Gateway Timeout)
      retryArray.push(user);
    } else {
      // Do not retry if status is 3xx or 4xx or 5xx and not included
      // in retryStatusCodes
      failedPermanentlyArray.push(user);
    }
  }
}

const upsertUsers = async (userData) => {
  retryArray = [];
  // Concurrency defaults to 25 if not specified in config.json
  await Promise.map(userData, async (user) => {
    try {
      await upsertUser({ user });
    } catch (error) {
      console.error(error);
      retryArray.push(user);
    }
  }, { concurrency: config.parallelism || 25 });
}

const delayRetry = (delayTime) =>
  new Promise((resolve) => setTimeout(resolve, delayTime));

const startUpsertUsers = async () => { 
  await upsertUsers(data);

  while (retryArray.length > 0 && retryCount < 3) {
    // Backing off each sucessive retry
    const delayTime = retryCount * 500;
    await delayRetry(delayTime);
    await upsertUsers(retryArray);
    retryCount++;
  }
  failedPermanentlyArray = [...failedPermanentlyArray, ...retryArray];
  console.log(`Uploaded ${data.length - failedPermanentlyArray.length} user(s).`);
  console.log(`Complete with ${failedPermanentlyArray.length} error(s).`);
  console.log(`Retried ${retryCount} time(s).`);
}

startUpsertUsers();
