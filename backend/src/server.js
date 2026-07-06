require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const pdfParse = require("pdf-parse");
const jwt = require("jsonwebtoken");

const store = require("./store");
const { chunkText } = require("./chunk");
const { retrieve } = require("./retriever");
const { answerWithContextStream } = require("./agent");

const app = express();
app.use(cors());
app.use(express.json());

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const upload = multer({
  dest: path.join(__dirname, "..", "uploads"),
  limits: { fileSize: MAX_FILE_SIZE },
});

const JWT_SECRET = process.env.JWT_SECRET || "local_dev_secret";

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing token" });
  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

app.post("/api/auth/signup", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
  const token = jwt.sign({ userId: email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
  const token = jwt.sign({ userId: email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const { originalname, path: tmpPath, mimetype, size: sizeBytes } = req.file;
    let text = "";

    // Normalize filename for case-insensitive extension checks
    const originalLower = String(originalname || "").toLowerCase();
    const ext = path.extname(originalLower);
    const ALLOWED_EXTS = [".txt", ".md", ".pdf"];

    // Server-side allowlist: reject unsupported file types early.
    if (!ALLOWED_EXTS.includes(ext) && mimetype !== "application/pdf") {
      // Clean up temporary file before returning error
      try { fs.unlinkSync(tmpPath); } catch (e) { /* ignore */ }
      return res.status(400).json({ error: "Unsupported file type. Allowed types: .txt, .md, .pdf" });
    }

    let fileType = "txt";
    if (mimetype === "application/pdf" || ext === ".pdf") {
      const buffer = fs.readFileSync(tmpPath);
      const parsed = await pdfParse(buffer);
      text = parsed.text;
      fileType = "pdf";
    } else {
      // Safe to read as UTF-8 since we allowed only .txt and .md here
      text = fs.readFileSync(tmpPath, "utf-8");
      if (ext === ".md") fileType = "md";
    }

    const tags = req.body.tags ? req.body.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

    fs.unlinkSync(tmpPath);

    if (!text.trim()) {
      return res.status(400).json({ error: "Could not extract any text from this file" });
    }

    const contentHash = crypto.createHash("sha256").update(text).digest("hex");
    const existing = await store.findDocumentByHash(contentHash, req.userId);
    if (existing) {
      return res.status(409).json({ error: "Duplicate document detected" });
    }

    const docId = crypto.randomUUID();
    const createdAt = Date.now();
    await store.addDocument({ 
      id: docId, 
      userId: req.userId, 
      name: originalname, 
      rawText: text, 
      contentHash,
      fileType,
      sizeBytes,
      tags,
      createdAt
    });

    const rawChunks = chunkText(text);
    
    const chunks = rawChunks.map((chunkTextValue, i) => ({
      id: crypto.randomUUID(),
      docId,
      userId: req.userId,
      index: i,
      text: chunkTextValue,
      fileType,
      tags,
      uploadedAt: createdAt,
    }));
    await store.addChunks(chunks);

    res.json({ docId, name: originalname, chunkCount: chunks.length, sizeBytes });
  } catch (err) {
    console.error(err);
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "File too large. Maximum allowed size is 10 MB." });
    }
    const status = err.status || 500;
    res.status(status).json({ error: "Upload failed", detail: err.message });
  }
});

const STORAGE_LIMIT_MB = parseInt(process.env.STORAGE_LIMIT_MB, 10) || 100;

app.get("/api/documents", requireAuth, async (req, res) => {
  try {
    const docs = await store.getDocuments(req.userId);
    const safeDocs = await Promise.all(docs.map(async (d) => {
      const { rawText, ...rest } = d;
      const chunks = await store.getChunksByDoc(d.id, req.userId);
      rest.chunkCount = chunks.length;
      return rest;
    }));
    const totalStorageBytes = safeDocs.reduce(
      (sum, doc) => sum + (doc.sizeBytes || 0),
      0,
    );
    res.json({
      documents: safeDocs,
      storage: {
        totalBytes: totalStorageBytes,
        limitBytes: STORAGE_LIMIT_MB * 1024 * 1024,
      },
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: "Failed to list documents", detail: err.message });
  }
});

app.get("/api/search", requireAuth, async (req, res) => {
  try {
    const { q, docId } = req.query;
    if (!q || !q.trim()) return res.status(400).json({ error: "Query parameter 'q' is required" });

    const query = q.trim();
    const SNIPPET_RADIUS = 80; // characters of context around each match
    const MAX_RESULTS = 50;

    let chunks;
    if (docId) {
      chunks = await store.getChunksByDoc(docId, req.userId);
    } else {
      chunks = await store.getChunks(req.userId);
    }

    const results = [];
    const queryLower = query.toLowerCase();

    for (const chunk of chunks) {
      const textLower = chunk.text.toLowerCase();
      let searchFrom = 0;
      while (searchFrom < textLower.length) {
        const matchIdx = textLower.indexOf(queryLower, searchFrom);
        if (matchIdx === -1) break;

        const snippetStart = Math.max(0, matchIdx - SNIPPET_RADIUS);
        const snippetEnd = Math.min(chunk.text.length, matchIdx + query.length + SNIPPET_RADIUS);
        const snippet = chunk.text.substring(snippetStart, snippetEnd);

        results.push({
          docId: chunk.docId,
          chunkId: chunk.id,
          chunkIndex: chunk.index,
          snippet,
          matchStart: matchIdx - snippetStart,
          matchEnd: matchIdx - snippetStart + query.length,
        });

        if (results.length >= MAX_RESULTS) break;
        searchFrom = matchIdx + query.length;
      }
      if (results.length >= MAX_RESULTS) break;
    }

    res.json({ query, total: results.length, results });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: "Search failed", detail: err.message });
  }
});

app.get("/api/documents/:docId/preview", requireAuth, async (req, res) => {
  try {
    const doc = await store.getDocument(req.params.docId, req.userId);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const fullText = doc.rawText || "";
    const totalCharacters = fullText.length;
    const totalWords = fullText.split(/\s+/).filter(Boolean).length;
    
    if (req.query.full === "true") {
      return res.json({ text: fullText, totalCharacters, totalWords, fileType: doc.fileType });
    }

    const excerpt = fullText.substring(0, 2000);
    res.json({ text: excerpt, totalCharacters, totalWords, fileType: doc.fileType, isExcerpt: fullText.length > 2000 });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: "Failed to load preview", detail: err.message });
  }
});

app.delete("/api/documents/:docId", requireAuth, async (req, res) => {
  try {
    const doc = await store.getDocument(req.params.docId, req.userId);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    const chunks = await store.getChunksByDoc(req.params.docId, req.userId);
    const chunkCount = chunks.length;
    
    await store.deleteChunksByDoc(req.params.docId, req.userId);
    await store.deleteDocument(req.params.docId, req.userId);
    res.json({ ok: true, deletedChunkCount: chunkCount });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: "Delete failed", detail: err.message });
  }
});

app.patch("/api/documents/:docId", requireAuth, async (req, res) => {
  try {
    const { name, tags } = req.body;
    const updates = {};
    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) return res.status(400).json({ error: "Name cannot be empty" });
      if (trimmed.length > 200) return res.status(400).json({ error: "Name must be 200 characters or fewer" });
      updates.name = trimmed;
    }
    if (tags !== undefined) {
      updates.tags = Array.isArray(tags) ? tags : tags.split(",").map(t => t.trim()).filter(Boolean);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    await store.updateDocument(req.params.docId, req.userId, updates);
    res.json({ ok: true });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: "Update failed", detail: err.message });
  }
});

app.post("/api/chat", requireAuth, async (req, res) => {
  try {
    const { message, sessionId, filters = {} } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    if (typeof sessionId !== "string" || !sessionId.trim()) {
      return res.status(400).json({ error: "sessionId is required and must be a non-empty string" });
    }

    // Persist the user's message before starting the retrieval/stream to avoid
    // losing it if the server crashes mid-stream.
    try {
      await store.appendChatMessage(sessionId, req.userId, { role: "user", content: message });
    } catch (e) {
      // store will throw on invalid sessionId or write errors
      return res.status(400).json({ error: e.message || "Invalid sessionId" });
    }

    const topChunks = await retrieve(message, req.userId, 4, filters);

    const historyData = await store.getChatHistory(sessionId, req.userId);
    const history = historyData.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const sources = await Promise.all(topChunks.map(async (c, i) => {
      const doc = await store.getDocument(c.docId, req.userId);
      return {
        id: i + 1,
        docId: c.docId,
        docName: doc ? doc.name : 'Unknown',
        chunkIndex: c.index,
        score: c.score,
        excerpt: c.text.length > 100 ? c.text.substring(0, 100) + '...' : c.text
      };
    }));
    res.write(`event: sources\ndata: ${JSON.stringify(sources)}\n\n`);

    let fullReply = "";
    let replyType = "answer";
    let interrupted = false;

    try {
      const stream = answerWithContextStream(message, topChunks, history);
      for await (const chunk of stream) {
          // Log every chunk produced by the agent stream for end-to-end tracing
          if (process.env.ANTHROPIC_DEBUG_PAYLOAD === "1") {
            try {
              console.log("[SSE DEBUG] agent chunk:", JSON.stringify(chunk));
            } catch (e) {
              console.log("[SSE DEBUG] agent chunk:", String(chunk));
            }
          }
        if (chunk.event === "decision") {
          replyType = chunk.type;
          res.write(`event: decision\ndata: ${replyType}\n\n`);
        } else if (chunk.event === "text") {
          fullReply += chunk.text;
            // Log the exact string being written to the SSE
            if (process.env.ANTHROPIC_DEBUG_PAYLOAD === "1") console.log("[SSE DEBUG] write text:", chunk.text);
            res.write(`event: text\ndata: ${JSON.stringify(chunk.text)}\n\n`);
        } else if (chunk.event === "error") {
          // agent.js yields this (instead of throwing) when the Anthropic
          // call fails to start or the stream dies mid-response. Forward
          // it to the client as its own SSE event so the frontend can
          // show a real error instead of silently ending with an empty
          // chat bubble.
          interrupted = true;
          console.error("Agent stream reported an error:", chunk.message);
          res.write(`event: error\ndata: ${JSON.stringify({ error: chunk.message || "The assistant failed to respond" })}\n\n`);
        }
      }
    } catch (streamErr) {
      // Mark that the assistant response was interrupted and include a short
      // marker in the persisted content so the history reflects the partial
      // response. Also forward an SSE error event now, since previously
      // nothing was sent to the client on this path and the chat bubble
      // would just render empty with no explanation.
      interrupted = true;
      console.error('Stream error (assistant generation interrupted):', streamErr && streamErr.message ? streamErr.message : streamErr);
      res.write(`event: error\ndata: ${JSON.stringify({ error: streamErr.message || "The assistant response was interrupted" })}\n\n`);
    }

    // Persist assistant reply before closing stream to ensure it's saved.
    try {
      let contentToPersist = fullReply || "";
      if (interrupted) {
        const marker = "\n\n[Response interrupted during generation]";
        contentToPersist = contentToPersist + marker;
      }
      await store.appendChatMessage(sessionId, req.userId, { role: "assistant", content: contentToPersist });
    } catch (e) {
      // Log persistence failure clearly but do NOT attempt to retract the
      // response the client already received. This ensures the demo UX
      // remains stable while making the failure visible in server logs.
      console.error('Failed to persist assistant message to chat history:', e && e.stack ? e.stack : e);
    }

    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      const status = err.status || 500;
      res.status(status).json({ error: "Chat failed", detail: err.message });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

app.get("/api/chat/:sessionId", requireAuth, async (req, res) => {
  try {
    const history = await store.getChatHistory(req.params.sessionId, req.userId);
    res.json(history);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: "Failed to get chat history", detail: err.message });
  }
});

const PORT = process.env.PORT || 5050;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`RAG backend running on http://localhost:${PORT}`);
  });
}

module.exports = app;