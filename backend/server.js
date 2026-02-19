require("dotenv").config()
const express=require("express")
const cors=require("cors")
const mongoose=require("mongoose")

const uploadRoute=require("./routes/upload")
const chatRoute=require("./routes/chat")
const authRoutes = require("./routes/auth")
const app=express()
app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
    .then(()=>{
        console.log("MongoDB connected")
    })
    .catch(err=>{
        console.log(err)
    })

app.use("/api/upload",uploadRoute)
app.use("/api/chat",chatRoute)
app.use("/auth",authRoutes)


const port=5000
app.listen(port,()=>{
    console.log("server is runnig on http://localhost:5000/")
})