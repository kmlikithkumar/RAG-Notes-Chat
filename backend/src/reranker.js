/**
 * Reranking after initial retrieval is cheaper than running a cross-encoder 
 * over the entire corpus directly because cross-encoders must process the 
 * (Query + Document) pair together through all layers of a deep transformer 
 * neural network. Doing this for thousands of documents per query is computationally 
 * prohibitive and incredibly slow.
 * 
 * Instead, we use cheap, pre-computed bi-encoders (cosine similarity) and/or 
 * BM25 to whittle the corpus down to a small candidate set (e.g., top 20-50). 
 * Then, we only run the expensive, highly-accurate cross-encoder on those 
 * candidate pairs to determine the true top K.
 */

async function rerank(query, candidates, k = 4) {
  if (!candidates || candidates.length === 0) return [];

  // Ensure `fetch` exists (Node <18 needs a polyfill). Prefer global
  // fetch when available, otherwise try to require `node-fetch`.
  if (typeof fetch === "undefined") {
    try {
      // node-fetch v2 exports a CommonJS function
      // eslint-disable-next-line global-require
      global.fetch = require("node-fetch");
    } catch (e) {
      console.warn("fetch is not available and node-fetch could not be required; reranker may not work on this Node runtime.");
    }
  }

  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    console.warn("VOYAGE_API_KEY not set — skipping reranking and returning candidates as-is.");
    return candidates.slice(0, k);
  }

  const texts = candidates.map((c) => c.text);

  let response;
  try {
    response = await fetch("https://api.voyageai.com/v1/rerank", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      query: query,
      documents: texts,
      model: "rerank-2",
      top_k: k
    })
    });
  } catch (e) {
    console.warn("Voyage rerank request failed; returning un-reranked candidates:", e.message || e);
    return candidates.slice(0, k);
  }

  if (!response.ok) {
    const errText = await response.text();
    console.warn(`Voyage Rerank API error: ${response.status} ${errText}; returning un-reranked candidates.`);
    return candidates.slice(0, k);
  }

  const data = await response.json();
  
  // data.data is an array of objects: { index, relevance_score }
  // We map these indices back to our original candidate objects and overwrite the score
  const rerankedChunks = data.data.map((item) => ({
    ...candidates[item.index],
    score: item.relevance_score
  }));

  return rerankedChunks;
}

module.exports = { rerank };
