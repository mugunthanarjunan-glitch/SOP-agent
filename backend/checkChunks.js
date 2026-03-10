require('dotenv').config();
const mongoose = require('mongoose');
const Chunk = require('./models/Chunk');

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const total = await Chunk.countDocuments();
    console.log(`Total chunks: ${total}`);

    if (total === 0) {
        console.log('No chunks found - PDF was never uploaded to this cluster!');
        process.exit(0);
    }

    const sample = await Chunk.findOne();
    console.log('Sample chunk:');
    console.log('  - text length:', sample.text?.length ?? 'N/A');
    console.log('  - embedding type:', typeof sample.embedding);
    console.log('  - embedding is array:', Array.isArray(sample.embedding));
    console.log('  - embedding length:', sample.embedding?.length ?? 'N/A');
    console.log('  - first 3 values:', sample.embedding?.slice(0, 3));
    console.log('  - documentName:', sample.documentName);
    console.log('  - pageNumber:', sample.pageNumber);

    // Check for bad embeddings
    const badChunks = await Chunk.countDocuments({
        $or: [
            { embedding: { $exists: false } },
            { embedding: { $size: 0 } },
            { embedding: null }
        ]
    });
    console.log(`\nChunks with bad/empty embeddings: ${badChunks}`);

    process.exit(0);
}

check().catch(e => { console.error(e); process.exit(1); });
