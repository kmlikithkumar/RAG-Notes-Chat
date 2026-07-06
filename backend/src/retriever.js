const store = require("./store");

const STOPWORDS = new Set(
  (
    "a an the is are was were be been being to of in on for with and or but " +
    "this that these those it its as at by from into over under again " +
    "further then once here there when where why how all any both each few " +
    "more most other some such no nor not only own same so than too very " +
    "can will just should now i you he she they we"
  ).split(" ")
);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t));
}

function termFreq(tokens) {
  const tf = {};
  for (const t of tokens) tf[t] = (tf[t] || 0) + 1;
  const total = tokens.length || 1;
  for (const k in tf) tf[k] = tf[k] / total;
  return tf;
}

function buildIDF(allTokenLists) {
  const df = {};
  const N = allTokenLists.length || 1;
  for (const tokens of allTokenLists) {
    const seen = new Set(tokens);
    for (const t of seen) df[t] = (df[t] || 0) + 1;
  }
  const idf = {};
  for (const t in df) {
    idf[t] = Math.log(1 + N / df[t]);
  }
  return idf;
}

function vectorize(tf, idf) {
  const vec = {};
  for (const term in tf) {
    vec[term] = tf[term] * (idf[term] || 0);
  }
  return vec;
}

function dictCosineSim(vecA, vecB) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const k in vecA) {
    dot += vecA[k] * (vecB[k] || 0);
    magA += vecA[k] * vecA[k];
  }
  for (const k in vecB) {
    magB += vecB[k] * vecB[k];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function retrieve(query, userId, k = 4, filters = {}) {
  const chunks = await store.getChunksByFilters(userId, filters);
  if (chunks.length === 0) return [];

  const chunkTokenLists = chunks.map((c) => tokenize(c.text));
  const idf = buildIDF(chunkTokenLists);

  const chunkVectors = chunkTokenLists.map((tokens) => vectorize(termFreq(tokens), idf));
  const queryVec = vectorize(termFreq(tokenize(query)), idf);

  const scored = chunks.map((c, i) => ({
    ...c,
    score: dictCosineSim(queryVec, chunkVectors[i]),
  }));

  scored.sort((a, b) => b.score - a.score);
  // Return the top-k chunks by score even if some scores are 0.
  // If there are no chunks at all, return an empty array above.
  return scored.slice(0, k);
}

module.exports = { retrieve, tokenize };
