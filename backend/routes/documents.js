const express = require("express");
const Chunk = require("../models/Chunk");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// GET all unique documents uploaded
router.get("/", authMiddleware, roleMiddleware("admin"), async (req, res) => {
    try {
        const documents = await Chunk.aggregate([
            {
                $group: {
                    _id: "$documentName",
                    chunkCount: { $sum: 1 },
                    createdAt: { $min: "$_id" } // Approximate upload time using the earliest chunk ObjectId
                }
            },
            {
                $project: {
                    documentName: "$_id",
                    chunkCount: 1,
                    createdAt: 1,
                    _id: 0
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.json(documents);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error fetching documents" });
    }
});

// DELETE a document by name
router.delete("/:documentName", authMiddleware, roleMiddleware("admin"), async (req, res) => {
    try {
        const { documentName } = req.params;

        if (!documentName) {
            return res.status(400).json({ error: "Document name required" });
        }

        const deleteResult = await Chunk.deleteMany({ documentName });

        if (deleteResult.deletedCount === 0) {
            return res.status(404).json({ error: "Document not found" });
        }

        res.json({ message: `Successfully deleted document and its ${deleteResult.deletedCount} chunks.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error deleting document" });
    }
});

module.exports = router;
