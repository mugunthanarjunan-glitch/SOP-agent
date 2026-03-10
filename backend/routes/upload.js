const express = require("express")
const multer = require("multer")
const pdfparse = require("pdf-parse")
const Chunk = require("../models/Chunk")
const chunkText = require("../utils/chunkText")
const createEmbedding = require("../utils/embedding")

const authMiddleware = require("../middleware/authMiddleware")
const roleMiddleware = require("../middleware/roleMiddleware")

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post("/", authMiddleware, roleMiddleware("admin"), upload.single("pdf"), async (req, res) => {
    try {
        const documentName = req.file.originalname;
        // pdf-parse allows you to render specific pages
        const render_page = function (pageData) {
            let render_options = {
                normalizeWhitespace: true,
                disableCombineTextItems: false
            }
            return pageData.getTextContent(render_options)
                .then(function (textContent) {
                    let lastY, text = '';
                    for (let item of textContent.items) {
                        if (lastY == item.transform[5] || !lastY) {
                            text += item.str;
                        }
                        else {
                            text += '\n' + item.str;
                        }
                        lastY = item.transform[5];
                    }
                    return text;
                });
        }

        let options = {
            pagerender: render_page
        }

        const pdfData = await pdfparse(req.file.buffer, options)

        // pdf-parse gives us an array of page text if we split it right.
        // Actually, pdfData.text is all pages. A better way to get per-page text is to read it page by page!
        // Wait, standard pdf-parse does not easily expose per page text array out-of-the-box in pdfData.text (it merges them with \n\n). 
        // We can split pdfData.text by \n\n (which is what pdfparse inserts between pages by default).

        const pagesText = pdfData.text.split('\n\n'); // Approximation of pages

        for (let i = 0; i < pagesText.length; i++) {
            const pageText = pagesText[i].trim();
            if (!pageText) continue;

            const chunks = chunkText(pageText);
            const pageNumber = i + 1; // 1-indexed page

            for (let chunk of chunks) {
                const embedding = await createEmbedding(chunk)
                await Chunk.create({
                    text: chunk,
                    embedding,
                    documentName,
                    pageNumber,
                    uploadedBy: req.user.id
                })
            }
        }

        res.json({ message: "PDF processed successfully" })
    }
    catch (error) {
        console.error(error)
        res.status(500).json({ error: "Error processing PDF" })
    }
})

module.exports = router