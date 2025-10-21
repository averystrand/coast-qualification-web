const { setCors, handleOptions } = require('./_lib/cors');
const { readBody } = require('./_lib/body');
const { set, get, del, makeKey } = require('./_lib/storage');
const { sendJson } = require('./_lib/respond');
const { findDomain, extractRunId, cleanDomain } = require('./_lib/extract');

const TTL_SECONDS = parseInt(process.env.RESULT_TTL_SECONDS || '900', 10);

function buildUrl(req) {
  const host = req.headers.host || 'localhost';
  return new URL(req.url, `http://${host}`);
}

async function handleGet(req, res) {
  const url = buildUrl(req);
  const domainParam = cleanDomain(url.searchParams.get('domain'));
  const runParam = url.searchParams.get('runId');

  let domain = domainParam;
  if (!domain && runParam) {
    const runData = await get(makeKey(['qualification-run', runParam]));
    domain = cleanDomain(runData && runData.domain);
  }

  if (!domain) {
    sendJson(res, 400, { error: 'domain or runId query parameter is required' });
    return;
  }

  const record = await get(makeKey(['qualification', domain]));
  if (!record) {
    sendJson(res, 200, { status: 'pending' });
    return;
  }

  sendJson(res, 200, record);
}

async function handlePost(req, res) {
  let body;
  try {
    body = await readBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const domain = findDomain(body);
  if (!domain) {
    sendJson(res, 400, { error: 'Unable to determine domain from payload' });
    return;
  }

  const runId = extractRunId(body);
  const normalized = body.normalized || body.data?.normalized || body;
  const stored = {
    status: 'complete',
    runId,
    normalized,
    receivedAt: new Date().toISOString(),
  };

  await set(makeKey(['qualification', domain]), stored, { ex: TTL_SECONDS });
  if (runId) {
    await set(makeKey(['qualification-run', runId]), { domain }, { ex: TTL_SECONDS });
  }

  sendJson(res, 200, { ok: true });
}

async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) {
    return;
  }

  if (req.method === 'GET') {
    await handleGet(req, res);
    return;
  }

  if (req.method === 'POST') {
    await handlePost(req, res);
    return;
  }

  if (req.method === 'DELETE') {
    const url = buildUrl(req);
    const domain = cleanDomain(url.searchParams.get('domain'));
    if (domain) {
      await del(makeKey(['qualification', domain]));
    }
    res.statusCode = 204;
    res.end();
    return;
  }

  res.setHeader('Allow', 'GET,POST,DELETE,OPTIONS');
  sendJson(res, 405, { error: 'Method not allowed' });
}

module.exports = handler;
