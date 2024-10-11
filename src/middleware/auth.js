const jwt = require("jsonwebtoken")
const User = require("../models/user")
// const SECRET_KEY = "K74jdfP0*(7"

const userAuth = async(req, res, next) => {
    try {
        let authToken = req.headers['authorization']
        if(!authToken) throw new Error("Invalid authorization")
        authToken = authToken.split(' ')[1]
        const decodeJWT = await jwt.verify(authToken, process.env.ACCESS_TOKEN_SECRET_KEY)
        const user = await User.findById(decodeJWT._id)
        if(!user){
            throw new Error("User not found!")
        }
        req.user = user
        next()
    } catch (error) {
        res.status(400).send("ERROR: " + error.message)
    } 
}

module.exports = {
    userAuth
}