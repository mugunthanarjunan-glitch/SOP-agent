const express = require("express");
const Chunk = require("../models/Chunk");
const ChatSession = require("../models/ChatSession");
const Message = require("../models/Message");
const createEmbedding = require("../utils/embedding");
const OpenAI = require("openai");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

router.post("/session", authMiddleware, async (req, res) => {
  try {
    const session = await ChatSession.create({
      userId: req.user.id,
      title: "New Chat",
    });

    res.json(session);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error creating session" });
  }
});

router.get("/sessions", authMiddleware, async (req, res) => {
  try {
    const sessions = await ChatSession.find({
      userId: req.user.id,
    }).sort({ updatedAt: -1 });

    res.json(sessions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching sessions" });
  }
});

router.get("/:sessionId", authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ChatSession.findOne({
      _id: sessionId,
      userId: req.user.id,
    });

    if (!session) {
      return res.status(403).json({ error: "Unauthorized session access" });
    }

    const messages = await Message.find({ sessionId })
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fetching messages" });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { question, sessionId } = req.body;

    if (!question || !sessionId) {
      return res.status(400).json({
        error: "Missing question or sessionId",
      });
    }

    const session = await ChatSession.findOne({
      _id: sessionId,
      userId: req.user.id,
    });

    if (!session) {
      return res.status(403).json({
        error: "Unauthorized session access",
      });
    }

    await Message.create({
      sessionId,
      role: "user",
      content: question,
    });

    await ChatSession.findByIdAndUpdate(sessionId, {
      lastMessage: question,
    });

    console.time("Embedding");
    const questionEmbedding = await createEmbedding(question);
    console.timeEnd("Embedding");

    console.time("VectorSearch");
    const results = await Chunk.aggregate([
      {
        $vectorSearch: {
          index: "vector_index_1",
          path: "embedding",
          queryVector: questionEmbedding,
          numCandidates: 100,
          limit: 3,
        },
      },
      {
        $project: {
          text: 1,
          documentName: 1,
          pageNumber: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);
    console.timeEnd("VectorSearch");
    console.log(`VectorSearch returned ${results.length} results. Top score: ${results[0]?.score ?? 'N/A'}`);

    if (!results.length || results[0].score < 0.3) {
      // Must respond with SSE since the frontend reads this as an event stream
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const noAnswerMsg = results.length === 0
        ? "I don't know. No SOP documents have been uploaded to the knowledge base yet. Please ask an admin to upload relevant documents."
        : "I don't know. This question is not covered in the available SOP documents.";

      // Save the "I don't know" to conversation history
      await Message.create({ sessionId, role: "assistant", content: noAnswerMsg });

      res.write(`data: ${JSON.stringify({ type: 'sources', sources: [] })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'content', content: noAnswerMsg })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      return res.end();
    }

    const context = results
      .map((r) => r.text)
      .join("\n\n")
      .slice(0, 3500);

    const history = await Message.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(5);

    const orderedHistory = history.reverse();

    console.time("Groq_LLM");

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // First send the sources to the client
    const sources = results.map((r) => ({
      document: r.documentName || "Unknown Document",
      page: r.pageNumber || "N/A",
      score: r.score.toFixed(3),
    }));

    res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);

    const OpenAI = require("openai");
    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const messages = [
      {
        role: "system",
        content: "You are a corporate knowledge assistant. Answer ONLY from the provided SOP context. Cite your source for every claim. If the answer is not in the context, say 'I don't know.' Do NOT use outside knowledge.",
      },
      ...orderedHistory.map((m) => ({ role: m.role, content: m.content })),
      {
        role: "user",
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ];

    let fullAnswer = "";

    try {
      const stream = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages,
        temperature: 0.2,
        max_tokens: 800,
        stream: true,
      });

      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || "";
        if (token) {
          fullAnswer += token;
          res.write(`data: ${JSON.stringify({ type: 'content', content: token })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
      console.log("Groq_LLM done");
    } catch (llmError) {
      console.error("LLM Error:", llmError.message);
      res.write(`data: ${JSON.stringify({ type: 'content', content: "Error: " + llmError.message })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
      return;
    }

    // Save assistant message to DB after stream closes
    await Message.create({
      sessionId,
      role: "assistant",
      content: fullAnswer,
    });




  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error answering questions",
    });
  }
});

module.exports = router;
