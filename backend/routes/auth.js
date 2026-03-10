const express = require("express")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const User = require("../models/Users")

const router = express.Router()

router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body
        const hashpass = await bcrypt.hash(password, 10)

        const user = await User.create({
            name, email, password: hashpass, role
        })

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        )

        res.json({
            message: "User created",
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        })
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: "Email already registered" })
        }
        console.error(error)
        res.status(500).json({ error: "Registration failed" })
    }
})

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body

        const user = await User.findOne({ email })
        if (!user) {
            return res.status(400).json({ error: "Incorrect email or password" })
        }

        const match = await bcrypt.compare(password, user.password)
        if (!match) {
            return res.status(400).json({ error: "Incorrect email or password" })
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        )

        res.json({
            message: "Login successful",
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Login failed" })
    }
})

module.exports = router