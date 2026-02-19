const mongoose = require("mongoose")

const chunkSchema= new mongoose.Schema({
    text:String,
    embedding:{
        type:[Number],
        require:true
    },
    uploadedBy:{type:mongoose.Schema.Types.ObjectId,ref:"User"}
})

module.exports=mongoose.model("Chunk",chunkSchema)