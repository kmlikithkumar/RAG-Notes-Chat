// backend/src/qdrant.js

/**
 * Placeholder Qdrant client.
 * This implementation allows the application and tests to run even if
 * Qdrant is not configured.
 *
 * Replace these functions with real Qdrant API calls when integrating
 * vector search.
 */

async function initQdrant() {
  return true;
}

async function upsertVectors(collectionName, vectors = []) {
  return {
    success: true,
    collection: collectionName,
    count: Array.isArray(vectors) ? vectors.length : 0,
  };
}

async function searchVectors(collectionName, queryVector = [], limit = 5) {
  return [];
}

async function deleteVectors(collectionName, ids = []) {
  return {
    success: true,
    deleted: Array.isArray(ids) ? ids.length : 0,
  };
}

async function createCollection(collectionName) {
  return {
    success: true,
    collection: collectionName,
  };
}

async function deleteCollection(collectionName) {
  return {
    success: true,
    collection: collectionName,
  };
}

async function collectionExists(collectionName) {
  return true;
}

module.exports = {
  initQdrant,
  upsertVectors,
  searchVectors,
  deleteVectors,
  createCollection,
  deleteCollection,
  collectionExists,
};
