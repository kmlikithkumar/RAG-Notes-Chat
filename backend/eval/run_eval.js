require("dotenv").config({ path: "../.env" });
const fs = require("fs");
const path = require("path");
const { embedTexts, scoreBM25, fuseRRF } = require("../src/retriever");

const CORPUS = [
  { id: "chunk_0", text: "The Solar System formed 4.6 billion years ago from the gravitational collapse of a giant interstellar molecular cloud. The vast majority of the system's mass is in the Sun." },
  { id: "chunk_1", text: "Jupiter is the largest planet in the Solar System. It is a gas giant with a mass more than two and a half times that of all the other planets in the Solar System combined." },
  { id: "chunk_2", text: "Mars is the fourth planet from the Sun. It is known as the Red Planet due to the effect of the iron oxide prevalent on Mars's surface, which gives it a reddish appearance." },
  { id: "chunk_3", text: "Saturn is the sixth planet from the Sun. It is best known for its prominent ring system, which is composed mostly of ice particles, with a smaller amount of rocky debris." },
  { id: "chunk_4", text: "Venus is the second planet from the Sun. It is sometimes called Earth's sister planet because of their similar size, mass, proximity to the Sun, and bulk composition." },
  { id: "chunk_5", text: "Uranus has a unique configuration because its axis of rotation is tilted sideways, nearly into the plane of its solar orbit. Its north and south poles lie where most other planets have their equators." },
  { id: "chunk_6", text: "Neptune is the eighth and farthest-known Solar planet from the Sun. In the Solar System, it is the fourth-largest planet by diameter, the third-most-massive planet, and the densest giant planet." },
  { id: "chunk_7", text: "Pluto is a dwarf planet in the Kuiper belt, a ring of bodies beyond the orbit of Neptune. It was the first object discovered in the Kuiper belt and remains the largest known plutoid." },
  { id: "chunk_8", text: "The Moon is Earth's only natural satellite. It is the fifth largest satellite in the Solar System and the largest among planetary satellites relative to the size of the planet that it orbits." },
  { id: "chunk_9", text: "Titan is the largest moon of Saturn and the second-largest natural satellite in the Solar System. It is the only moon known to have a dense atmosphere." },
];

const QUERIES = [
  { query: "When did the Solar System form?", expectedId: "chunk_0" },
  { query: "Which planet has the most mass besides the sun?", expectedId: "chunk_1" },
  { query: "Why is Mars called the Red Planet?", expectedId: "chunk_2" },
  { query: "What are Saturn's rings made of?", expectedId: "chunk_3" },
  { query: "Which planet is considered Earth's sister?", expectedId: "chunk_4" },
  { query: "Which planet rotates on its side?", expectedId: "chunk_5" },
  { query: "What is the farthest known planet from the sun?", expectedId: "chunk_6" },
  { query: "Is Pluto considered a dwarf planet?", expectedId: "chunk_7" },
  { query: "What is Earth's only natural satellite?", expectedId: "chunk_8" },
  { query: "Which moon has a dense atmosphere?", expectedId: "chunk_9" },
  { query: "What causes the reddish appearance of the fourth planet?", expectedId: "chunk_2" },
  { query: "Largest moon of Saturn", expectedId: "chunk_9" },
];

function dcgAtK(rankedIds, targetId, k) {
  for (let i = 0; i < Math.min(k, rankedIds.length); i++) {
    if (rankedIds[i] === targetId) {
      return 1 / Math.log2(i + 2); // rank is 0-indexed, so (i+1)+1
    }
  }
  return 0;
}

async function runEval() {
  console.log("Starting Evaluation...");
  const k = 4;
  
  if (!process.env.VOYAGE_API_KEY) {
    console.error("VOYAGE_API_KEY is missing. Please set it to run eval.");
    process.exit(1);
  }

  const texts = CORPUS.map(c => c.text);
  const embeddings = await embedTexts(texts);
  
  const chunks = CORPUS.map((c, i) => ({
    id: c.id,
    text: c.text,
    embedding: embeddings[i]
  }));

  let totalPrecision = 0;
  let totalRecall = 0;
  let totalMRR = 0;
  let totalNDCG = 0;

  const results = [];

  for (const item of QUERIES) {
    const { query, expectedId } = item;
    
    // Simulate Dense retrieval
    const [qEmb] = await embedTexts([query]);
    const denseRanked = chunks.map(c => {
      // compute cosine sim
      let dot = 0, magA = 0, magB = 0;
      for (let i=0; i<qEmb.length; i++) {
        dot += qEmb[i] * c.embedding[i];
        magA += qEmb[i]*qEmb[i];
        magB += c.embedding[i]*c.embedding[i];
      }
      return { ...c, score: dot / (Math.sqrt(magA)*Math.sqrt(magB)) };
    }).sort((a,b) => b.score - a.score).slice(0, 60);

    // Simulate BM25
    const bm25Ranked = scoreBM25(query, chunks).slice(0, 60);

    // Fuse using our real RRF logic
    const fused = fuseRRF(denseRanked, bm25Ranked, k);
    const retrievedIds = fused.map(f => f.id);

    const rankIndex = retrievedIds.indexOf(expectedId);
    
    let pAtK = 0, rAtK = 0, mrr = 0, ndcg = 0;
    
    if (rankIndex !== -1) {
      pAtK = 1 / k;
      rAtK = 1;
      mrr = 1 / (rankIndex + 1);
      ndcg = dcgAtK(retrievedIds, expectedId, k);
    }

    totalPrecision += pAtK;
    totalRecall += rAtK;
    totalMRR += mrr;
    totalNDCG += ndcg;

    results.push({
      query,
      expected: expectedId,
      retrieved: retrievedIds,
      rank: rankIndex !== -1 ? rankIndex + 1 : -1,
      ndcg
    });
  }

  const N = QUERIES.length;
  const summary = {
    "Precision@4": (totalPrecision / N).toFixed(3),
    "Recall@4": (totalRecall / N).toFixed(3),
    "MRR": (totalMRR / N).toFixed(3),
    "nDCG@4": (totalNDCG / N).toFixed(3),
  };

  console.table([summary]);

  const outputDir = path.join(__dirname);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  
  fs.writeFileSync(path.join(outputDir, "results.json"), JSON.stringify({ summary, queries: results }, null, 2));
  console.log(`Saved results to ${path.join(outputDir, "results.json")}`);
}

runEval().catch(console.error);
