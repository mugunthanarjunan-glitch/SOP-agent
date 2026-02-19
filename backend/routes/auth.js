const express = require("express")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const User = require("../models/Users")

const router = express.Router()

router.post("/register",async (req,res) => {
    const {name, email, password, role} = req.body

    const hashpass = await bcrypt.hash(password,10)

    await User.create({
        name,email,password:hashpass,role
    })
    res.json({message:"User created"})

})

router.post("/login", async (req,res) => {
    const {email,password,role}=req.body

    const user= await User.findOne({email})
    if(!user){
        return res.status(400).json({message:"User not Found"})
    }

    const match = await bcrypt.compare(password,user.password)
    if(!match){
        return res.status(400).json({message:"Wrong password"})
    }

    const token = jwt.sign(
        {id:user._id, role:user.role},
        process.env.JWT_SECRET,
        {expiresIn:"1d"}
    )

    res.json({token,role:user.role})
})

module.exports = router