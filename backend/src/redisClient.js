const { createClient } = require('redis');

let client = null;
let isConnected = false;

async function getClient() {
  if (client) return isConnected ? client : null;

  const url = process.env.REDIS_URL;
  if (!url) {
    return null; // Caching disabled
  }

  try {
    client = createClient({ url });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err.message);
      isConnected = false;
    });

    client.on('connect', () => {
      isConnected = true;
    });

    await client.connect();
    return client;
  } catch (err) {
    console.error("Failed to connect to Redis. Caching is disabled.", err.message);
    isConnected = false;
    return null;
  }
}

async function get(key) {
  try {
    const c = await getClient();
    if (!c) return null;
    return await c.get(key);
  } catch (err) {
    return null;
  }
}

async function set(key, value, ttlSeconds) {
  try {
    const c = await getClient();
    if (!c) return;
    if (ttlSeconds) {
      await c.setEx(key, ttlSeconds, value);
    } else {
      await c.set(key, value);
    }
  } catch (err) {
    // Ignore cache write errors
  }
}

module.exports = {
  get,
  set
};
