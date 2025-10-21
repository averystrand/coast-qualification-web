let memoryStore = global.__coastQualificationStore;
if (!memoryStore) {
  memoryStore = new Map();
  global.__coastQualificationStore = memoryStore;
}

function makeKey(parts) {
  return parts.filter(Boolean).join(':');
}

async function set(key, value, options = {}) {
  const ttl = options.ex || options.ttl;
  const kv = getKv();
  if (kv) {
    await kv.set(key, value, ttl ? { ex: ttl } : undefined);
    return;
  }

  const record = { value };
  if (ttl) {
    record.expiresAt = Date.now() + ttl * 1000;
  }
  memoryStore.set(key, record);
}

async function get(key) {
  const kv = getKv();
  if (kv) {
    return kv.get(key);
  }

  const record = memoryStore.get(key);
  if (!record) {
    return null;
  }
  if (record.expiresAt && record.expiresAt < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return record.value;
}

async function del(key) {
  const kv = getKv();
  if (kv) {
    await kv.del(key);
    return;
  }
  memoryStore.delete(key);
}

function hasKv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function getKv() {
  if (!hasKv()) {
    return null;
  }

  try {
    // eslint-disable-next-line global-require
    const { kv } = require('@vercel/kv');
    return kv;
  } catch (error) {
    console.warn('Failed to load @vercel/kv, using in-memory store instead.', error);
    return null;
  }
}

module.exports = { set, get, del, makeKey, hasKv };
