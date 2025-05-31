// backend/src/services/apify.js
const axios = require('axios');

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;

const apifyApi = axios.create({
  baseURL: 'https://api.apify.com/v2',
  headers: {
    'Authorization': `Bearer ${APIFY_API_TOKEN}`,
  },
});

async function runActor(actorId, input) {
  const response = await apifyApi.post(`/acts/${actorId}/runs`, { input });
  return response.data;
}

async function getRun(runId) {
  const response = await apifyApi.get(`/actor-runs/${runId}`);
  return response.data;
}

module.exports = {
  runActor,
  getRun,
};