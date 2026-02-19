const express=require("express")
const multer=require("multer")
const pdfparse=require("pdf-parse")
const Chunk=require("../models/Chunk")
const chunkText=require("../utils/chunkText")
const createEmbedding=require("../utils/embedding")

const authMiddleware = require("../middleware/authMiddleware")
const roleMiddleware = require("../middleware/roleMiddleware")

const router=express.Router()
const upload= multer({storage:multer.memoryStorage()})

router.post("/",authMiddleware,roleMiddleware("admin"),upload.single("pdf"),async(req,res)=>{
    try{
        const pdfData=await pdfparse(req.file.buffer)
        const chunks = chunkText(pdfData.text)

        for(let chunk of chunks){
            const embedding=await createEmbedding(chunk)
            await Chunk.create({text:chunk,embedding,uploadedBy:req.user.id})
        }
        res.json({message:"PDF processed successfully"})
    }
    catch(error){
        console.log(error)
        res.status(500).json({error:"Error processing PDF"})
    }
})

module.exports=router