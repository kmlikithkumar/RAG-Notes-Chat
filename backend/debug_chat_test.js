const fetch = require('node-fetch');
const fs = require('fs');

const API = 'http://127.0.0.1:5050/api';

async function signup() {
  const res = await fetch(`${API}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password' })
  });
  return res.json();
}

async function upload(token) {
  const form = new (require('form-data'))();
  form.append('file', fs.createReadStream(__dirname + '/test_doc.txt'), { filename: 'test_doc.txt' });
  const res = await fetch(`${API}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  return res.json();
}

async function chat(token, sessionId, message) {
  const res = await fetch(`${API}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ message, sessionId })
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('Chat request failed:', res.status, body);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let done = false;
  let buffer = '';
  console.log('--- SSE STREAM START ---');

  while (!done) {
    const { value, done: d } = await reader.read();
    done = d;
    if (value) {
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop();
      for (const part of parts) {
        if (!part.trim()) continue;
        console.log('RAW SSE PART:\n', part);
        const lines = part.split('\n');
        let type = 'message';
        let data = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) type = line.substring(7);
          else if (line.startsWith('data: ')) data = line.substring(6);
        }
        console.log('PARSED SSE ->', type, data);
      }
    }
  }

  console.log('--- SSE STREAM END ---');
}

(async () => {
  // create a small file to upload
  fs.writeFileSync(__dirname + '/test_doc.txt', 'This is a tiny test document. It mentions the color blue and the number 42.');

  const sig = await signup();
  const token = sig.token;
  console.log('token:', token);
  const uploadRes = await upload(token);
  console.log('uploadRes:', uploadRes);
  const sessionId = 'session-test-1';
  // connect directly to chat endpoint and stream
  await chat(token, sessionId, 'What color is mentioned in the document?');
})();
