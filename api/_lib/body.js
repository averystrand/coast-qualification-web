function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function readBody(req) {
  if (isObject(req.body)) {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    error.message = `Invalid JSON body: ${error.message}`;
    throw error;
  }
}

module.exports = { readBody };
