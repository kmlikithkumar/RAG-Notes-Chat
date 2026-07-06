// agent_debug_test.js
// Simple test runner to exercise answerWithContextStream with mock key.

const { answerWithContextStream } = require("./agent");

async function run() {
  process.env.ANTHROPIC_API_KEY = "mock_key_for_testing";
  process.env.ANTHROPIC_DEBUG_PAYLOAD = "1";

  const question = "What does chunk 1 say about policy?";
  const contextChunks = [{ text: "Policy states X and Y.", score: 0.9 }];
  const history = [{ role: "user", content: "Prior message" }];

  const stream = answerWithContextStream(question, contextChunks, history);
  for await (const ev of stream) {
    console.log("EVENT:", ev);
  }
  console.log("done");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
