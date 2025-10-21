const { setCors, handleOptions } = require('./_lib/cors');
const { readBody } = require('./_lib/body');
const { sendJson } = require('./_lib/respond');
const { set, makeKey } = require('./_lib/storage');
const { cleanDomain, extractRunId } = require('./_lib/extract');

const TTL_SECONDS = parseInt(process.env.RESULT_TTL_SECONDS || '900', 10);
const fetchFn = async (...args) => {
  if (typeof global.fetch === 'function') {
    return global.fetch(...args);
  }

  try {
    const { default: nodeFetch } = await import('node-fetch');
    return nodeFetch(...args);
  } catch (error) {
    throw new Error('Fetch API is not available in this environment. Please install node-fetch.');
  }
};

async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) {
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST,OPTIONS');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const domainValue = body.Domain || body.domain;
  const domain = cleanDomain(domainValue);
  if (!domain) {
    sendJson(res, 400, { error: 'Domain is required' });
    return;
  }

  const triggerUrl = process.env.CLAY_TRIGGER_URL;
  if (!triggerUrl) {
    sendJson(res, 500, { error: 'Missing CLAY_TRIGGER_URL environment variable' });
    return;
  }

  const clayPayload = JSON.stringify({ ...body, Domain: domain });

  let clayResponse;
  try {
    clayResponse = await fetchFn(triggerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CLAY_API_KEY ? { Authorization: `Bearer ${process.env.CLAY_API_KEY}` } : {}),
      },
      body: clayPayload,
    });
  } catch (error) {
    sendJson(res, 502, { error: 'Failed to reach Clay', details: error.message });
    return;
  }

  const text = await clayResponse.text();
  let clayJson = null;
  if (text) {
    try {
      clayJson = JSON.parse(text);
    } catch (error) {
      clayJson = null;
    }
  }

  if (!clayResponse.ok) {
    sendJson(res, clayResponse.status, {
      error: 'Clay responded with an error',
      status: clayResponse.status,
      details: clayJson || text,
    });
    return;
  }

  const runId = extractRunId(clayJson) || `run-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const domainKey = makeKey(['qualification', domain]);
  await set(domainKey, { status: 'pending', runId, updatedAt: new Date().toISOString() }, { ex: TTL_SECONDS });
  if (runId) {
    const runKey = makeKey(['qualification-run', runId]);
    await set(runKey, { domain }, { ex: TTL_SECONDS });
  }

  sendJson(res, 202, { status: 'queued', runId });
}

module.exports = handler;
