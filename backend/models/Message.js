const mongoose=require("mongoose")

const messageSchema = new mongoose.Schema({
    sessionId:{type:mongoose.Schema.Types.ObjectId, ref:"ChatSession"},
    role:{type:String,enum:["user","assistant"]},
    content:String,
    createdAt:{type:Date,default:Date.now}
})

module.exports = mongoose.model("Message",messageSchema)