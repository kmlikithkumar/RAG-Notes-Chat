// chunk.js
// Splits raw text into overlapping word-based chunks. Overlap keeps context
// from getting cut off mid-idea at chunk boundaries.

function chunkText(text, { chunkSize = 180, overlap = 30 } = {}) {
  const words = text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  const chunks = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunkWords = words.slice(start, end);
    chunks.push(chunkWords.join(" "));
    if (end === words.length) break;
    start = end - overlap; // step back for overlap
  }

  return chunks;
}

module.exports = { chunkText };
