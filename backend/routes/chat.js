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
          index: "vector_index",
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

    if (!results.length || results[0].score < 0.7) {
      return res.json({
        answer:
          "I don't know. This is not covered in the SOP documents.",
        sources: [],
      });
    }

    const context = results
      .map((r) => r.text)
      .join("\n\n")
      .slice(0, 3500);

    const history = await Message.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(5);

    const orderedHistory = history.reverse();

    console.time("LLM");
    const completion = await client.chat.completions.create({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content:
            "Answer strictly from the provided context. If not found, say 'I don't know.'",
        },

        ...orderedHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),

        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion:\n${question}`,
        },
      ],
    });
    console.timeEnd("LLM");

    const answer = completion.choices[0].message.content;

    await Message.create({
      sessionId,
      role: "assistant",
      content: answer,
    });

    const sources = results.map((r) => ({
      document: r.documentName || "Unknown Document",
      page: r.pageNumber || "N/A",
      score: r.score.toFixed(3),
    }));

    res.json({
      answer,
      sources,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error answering questions",
    });
  }
});

module.exports = router;
