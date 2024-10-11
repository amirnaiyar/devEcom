const express = require("express")
const userRouter = express.Router()
const { userAuth } = require("../middleware/auth")
const User = require("../models/user")

userRouter.get("/profile", userAuth, (req, res) => {
    try {
        const user = req.user
        res.json({
            data: user
        })
    } catch (error) {
        res.status(400).send("ERROR: " + error.message)
    }
})

userRouter.post("/profile/update" , userAuth, async(req, res) => {
    try {
        const loggedinUser = req.user
        const { name, phone, addresses } = req.body;
        const ALLOWED_UPDATE = [ "name", "phone", "addresses" ]
        const isAllowedUpdate =  Object.keys(req.body).every(field => ALLOWED_UPDATE.includes(field))
        if(isAllowedUpdate){
            const updateUser = await User.findByIdAndUpdate(loggedinUser._id, 
                { name, phone, addresses }, {new: true})
            res.json({
                status: "success",
                message: "User updated successful",
                data: updateUser
            })
        } else {
            throw new Error("Update not allowed on some field!")
        }
    } catch (error) {
        res.status(400).send("ERROR: " + error.message)
    }
})

module.exports = userRouter