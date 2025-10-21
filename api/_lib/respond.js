function sendJson(res, statusCode, payload) {
  if (!res.headersSent) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
  }
  res.end(JSON.stringify(payload));
}

module.exports = { sendJson };
