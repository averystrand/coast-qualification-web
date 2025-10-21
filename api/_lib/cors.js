const DEFAULT_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

function setCors(res, origin = DEFAULT_ORIGIN) {
  if (!res.headersSent) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (origin !== '*') {
      res.setHeader('Vary', 'Origin');
    }
  }
}

function handleOptions(req, res, origin = DEFAULT_ORIGIN) {
  if (req.method === 'OPTIONS') {
    setCors(res, origin);
    res.statusCode = 204;
    res.end();
    return true;
  }
  return false;
}

module.exports = { setCors, handleOptions };
