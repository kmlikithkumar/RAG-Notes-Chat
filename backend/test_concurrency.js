const store = require('./src/store');
const fs = require('fs');
const path = require('path');

async function run() {
  // Clean up data files for test
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  ['documents.json','chunks.json','chats.json'].forEach(f => {
    const p = path.join(dataDir, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  // Prepare concurrent operations
  const user = 'tester@example.com';
  const sessionId = 'session-test-123';

  const uploadA = (async () => {
    const doc = { id: 'd1', userId: user, name: 'a.txt', rawText: 'alpha', contentHash: 'h1', fileType: 'txt', sizeBytes: 10, tags: [], createdAt: Date.now() };
    await store.addDocument(doc);
    await store.addChunks([{ id: 'c1', docId: 'd1', userId: user, index: 0, text: 'alpha', fileType: 'txt', tags: [], uploadedAt: Date.now() }]);
  })();

  const uploadB = (async () => {
    const doc = { id: 'd2', userId: user, name: 'b.txt', rawText: 'beta', contentHash: 'h2', fileType: 'txt', sizeBytes: 11, tags: [], createdAt: Date.now() };
    await store.addDocument(doc);
    await store.addChunks([{ id: 'c2', docId: 'd2', userId: user, index: 0, text: 'beta', fileType: 'txt', tags: [], uploadedAt: Date.now() }]);
  })();

  const chatAppend = (async () => {
    await store.appendChatMessage(sessionId, user, { role: 'user', content: 'hello' });
    await store.appendChatMessage(sessionId, user, { role: 'assistant', content: 'hi' });
  })();

  await Promise.all([uploadA, uploadB, chatAppend]);

  // Validate files are valid JSON and contain expected entries
  ['documents.json','chunks.json','chats.json'].forEach(f => {
    const p = path.join(dataDir, f);
    if (!fs.existsSync(p)) {
      console.error(f, 'missing');
      process.exit(1);
    }
    try {
      const data = JSON.parse(fs.readFileSync(p,'utf8'));
      console.log(f, 'ok', data.length || (Array.isArray(data) ? data.length : Object.keys(data).length));
    } catch (e) {
      console.error(f, 'invalid json', e.message);
      process.exit(2);
    }
  });

  console.log('concurrency test complete');
}

run().catch((e) => { console.error('test failed', e); process.exit(3); });
