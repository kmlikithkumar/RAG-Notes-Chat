// agent.js
// Talks to Claude. Implements a tiny "agentic" decision step: given the
// user's question and the retrieved context, the model first decides
// whether it has enough signal to answer, or whether the question is too
// vague/ambiguous and it should ask a clarifying question instead.

const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-5"; // swap freely; see README

/**
 * @param {string} question
 * @param {Array<{text: string, score: number}>} contextChunks
 * @param {Array<{role: 'user'|'assistant', content: string}>} history
 */
async function* answerWithContextStream(question, contextChunks, history = []) {
  const contextBlock = contextChunks.length
    ? contextChunks
        .map((c, i) => `[Chunk ${i + 1}]\n${c.text}`)
        .join("\n\n")
    : "(no relevant chunks found)";

  const system = `You are a RAG assistant answering questions ONLY using the provided context chunks retrieved from the user's uploaded documents.

Decision rule (agentic step):
1. If the question is too vague or ambiguous to search/answer well (e.g. "tell me more", "what about the other part"), respond with a short clarifying question instead of an answer. Prefix your reply with "CLARIFY:".
2. Otherwise, answer strictly from the context chunks below. If the answer isn't in the context, say so plainly — do not make anything up. Prefix your reply with "ANSWER:".
3. When answering, you MUST cite the relevant chunks using their number in brackets, e.g., [1] or [2]. Place the citation directly after the sentence or claim it supports.

Context chunks:
${contextBlock}`;

  // IMPORTANT: Anthropic's API does NOT accept role: "system" inside the
  // `messages` array (that's an OpenAI-style convention). The system
  // prompt must be passed as its own top-level `system` param on the
  // request. `messages` may only contain role: "user" / "assistant".
  // Sending an invalid role causes the API to reject the request (400),
  // which — if uncaught — surfaces as a silent empty response on the
  // frontend instead of a visible error.
  const messages = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: question },
  ];

  // Optional debug logging of the payload (truncates long content)
  if (process.env.ANTHROPIC_DEBUG_PAYLOAD === "1") {
    try {
      const preview = {
        model: MODEL,
        max_tokens: 600,
        system: system.slice(0, 5000),
        messages: messages.map((m) => ({ role: m.role, content: String(m.content).slice(0, 5000) })),
      };
      console.log("[ANTHROPIC DEBUG] payload:", JSON.stringify(preview, null, 2));
    } catch (e) {
      console.error("Failed to stringify Anthropic payload for debug:", e);
    }
  }

  if (process.env.ANTHROPIC_API_KEY === "mock_key_for_testing") {
    yield { event: "decision", type: "answer" };
    yield { event: "text", text: "This is a mocked response since you are using a mock API key. According to chunk 1, this works! [1]" };
    return;
  }

  let stream;
  try {
    stream = await client.messages.stream({
      model: MODEL,
      max_tokens: 600,
      system,
      messages,
    });
  } catch (err) {
    // Surface API-level errors (bad request, auth, rate limit, etc.)
    // through the generator instead of failing silently.
    console.error("[agent.js] Failed to start Anthropic stream:", err?.status, err?.message, err?.error);
    yield {
      event: "error",
      message: err?.message || "Failed to reach the AI service",
    };
    return;
  }

  let buffer = "";
  let typeDecided = false;
  let type = "answer";

  try {
    for await (const chunk of stream) {
      if (process.env.ANTHROPIC_DEBUG_PAYLOAD === "1") {
        try {
          console.log("[ANTHROPIC DEBUG] raw chunk:", JSON.stringify(chunk));
        } catch (e) {
          console.log("[ANTHROPIC DEBUG] raw chunk (inspect):", String(chunk));
        }
      }

      // Robust extraction of textual deltas from various SDK chunk shapes.
      let text = "";
      try {
        if (typeof chunk === "string") {
          text = chunk;
        } else if (typeof chunk.text === "string") {
          text = chunk.text;
        } else if (chunk.delta) {
          if (typeof chunk.delta === "string") {
            text = chunk.delta;
          } else if (typeof chunk.delta.text === "string") {
            text = chunk.delta.text;
          } else if (Array.isArray(chunk.delta.content)) {
            text = chunk.delta.content
              .map((c) => (typeof c?.text === "string" ? c.text : typeof c === "string" ? c : ""))
              .join("");
          } else if (typeof chunk.delta.content === "string") {
            text = chunk.delta.content;
          }
        } else if (chunk.content) {
          if (typeof chunk.content === "string") text = chunk.content;
          else if (Array.isArray(chunk.content))
            text = chunk.content.map((c) => (typeof c?.text === "string" ? c.text : "")).join("");
        }
      } catch (e) {
        text = "";
      }

      if (text) {
        if (!typeDecided) {
          buffer += text;
          if (buffer.length >= 8 || buffer.includes(" ") || buffer.includes("\n")) {
            typeDecided = true;
            let outputText = buffer;

            if (buffer.startsWith("CLARIFY:")) {
              type = "clarify";
              outputText = buffer.slice(8).trimStart();
            } else if (buffer.startsWith("ANSWER:")) {
              type = "answer";
              outputText = buffer.slice(7).trimStart();
            }

            yield { event: "decision", type };
            if (outputText) {
              yield { event: "text", text: outputText };
            }
          }
        } else {
          yield { event: "text", text };
        }
      }
    }
  } catch (err) {
    // Errors thrown mid-stream (network drop, server error, etc.)
    console.error("[agent.js] Error while reading Anthropic stream:", err);
    yield {
      event: "error",
      message: err?.message || "The AI response was interrupted",
    };
    return;
  }

  if (!typeDecided) {
    type = "answer";
    let outputText = buffer;
    if (buffer.startsWith("CLARIFY:")) {
      type = "clarify";
      outputText = buffer.slice(8).trimStart();
    } else if (buffer.startsWith("ANSWER:")) {
      outputText = buffer.slice(7).trimStart();
    }
    yield { event: "decision", type };
    if (outputText) {
      yield { event: "text", text: outputText };
    }
  }
}

module.exports = { answerWithContextStream };