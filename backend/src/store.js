const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const docsFile = path.join(DATA_DIR, "documents.json");
const chunksFile = path.join(DATA_DIR, "chunks.json");
const chatsFile = path.join(DATA_DIR, "chats.json");

// Simple in-process per-file write queue to serialize writes and perform
// atomic writes (write to temp file then rename).
const writeQueues = new Map();

function readJson(file) {
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    // If the file is corrupted, return empty array rather than throwing
    // to avoid crashing the whole server. The races should be prevented
    // by our atomic write strategy.
    return [];
  }
}

function enqueueWrite(file, writeFn) {
  const prev = writeQueues.get(file) || Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() => writeFn())
    .catch((err) => {
      // Log but don't rethrow so later writes can proceed
      console.error(`write error for ${file}:`, err && err.message ? err.message : err);
    });
  writeQueues.set(file, next);
  return next;
}

function writeJson(file, data) {
  // Perform atomic write to a temporary file, then rename into place.
  return enqueueWrite(file, () => {
    return new Promise((resolve, reject) => {
      try {
        const tmp = `${file}.${Date.now()}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: "utf8" });
        // On most platforms rename is atomic.
        fs.renameSync(tmp, file);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

// ---- Documents ----
async function addDocument(doc) {
  const docs = readJson(docsFile);
  docs.push(doc);
  await writeJson(docsFile, docs);
  return doc;
}

async function getDocument(id, userId) {
  const docs = readJson(docsFile);
  return docs.find(d => d.id === id && d.userId === userId);
}

async function getDocuments(userId) {
  const docs = readJson(docsFile);
  return docs.filter(d => d.userId === userId);
}

async function deleteDocument(id, userId) {
  let docs = readJson(docsFile);
  docs = docs.filter(d => !(d.id === id && d.userId === userId));
  await writeJson(docsFile, docs);
}

async function updateDocument(id, userId, updates) {
  const docs = readJson(docsFile);
  const doc = docs.find(d => d.id === id && d.userId === userId);
  if (doc) {
    Object.assign(doc, updates);
    await writeJson(docsFile, docs);
  }
}

async function findDocumentByHash(contentHash, userId) {
  const docs = readJson(docsFile);
  return docs.find(d => d.contentHash === contentHash && d.userId === userId);
}

// ---- Chunks ----
async function addChunks(newChunks) {
  const chunks = readJson(chunksFile);
  chunks.push(...newChunks);
  await writeJson(chunksFile, chunks);
  return newChunks;
}

async function getChunks(userId) {
  const chunks = readJson(chunksFile);
  return chunks.filter(c => c.userId === userId);
}

async function getChunksByIds(ids, userId) {
  const chunks = readJson(chunksFile);
  return chunks.filter(c => ids.includes(c.id) && c.userId === userId);
}

async function getChunksByDoc(docId, userId) {
  const chunks = readJson(chunksFile);
  return chunks.filter(c => c.docId === docId && c.userId === userId);
}

async function getChunksByFilters(userId, filters = {}) {
  let chunks = await getChunks(userId);
  if (filters && filters.docIds && filters.docIds.length > 0) {
    chunks = chunks.filter(c => filters.docIds.includes(c.docId));
  }
  return chunks;
}

async function deleteChunksByDoc(docId, userId) {
  let chunks = readJson(chunksFile);
  chunks = chunks.filter(c => !(c.docId === docId && c.userId === userId));
  await writeJson(chunksFile, chunks);
}

// ---- Chats (per session) ----
async function getChatHistory(sessionId, userId) {
  // Validate sessionId shape to avoid accidental mixing of histories.
  if (typeof sessionId !== 'string' || !sessionId.trim()) {
    throw new Error('Invalid sessionId');
  }
  const chats = readJson(chatsFile);
  return chats
    .filter(c => c.sessionId === sessionId && c.userId === userId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

async function appendChatMessage(sessionId, userId, message) {
  // Validate sessionId shape to avoid accidental mixing of histories.
  if (typeof sessionId !== 'string' || !sessionId.trim()) {
    throw new Error('Invalid sessionId');
  }
  const chats = readJson(chatsFile);
  const msg = {
    userId,
    sessionId,
    role: message.role,
    content: message.content,
    createdAt: Date.now()
  };
  chats.push(msg);
  await writeJson(chatsFile, chats);
  return msg;
}

module.exports = {
  addDocument,
  getDocument,
  getDocuments,
  deleteDocument,
  updateDocument,
  findDocumentByHash,
  addChunks,
  getChunks,
  getChunksByIds,
  getChunksByDoc,
  getChunksByFilters,
  deleteChunksByDoc,
  getChatHistory,
  appendChatMessage,
};
