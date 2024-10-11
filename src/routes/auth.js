const express = require("express")
const authRouter = express.Router()
const User = require("../models/user")
const jwt = require("jsonwebtoken")
// const SECRET_KEY = "K74jdfP0*(7"
const bcrypt = require("bcrypt")
const { userAuth } = require("../middleware/auth")

// Signup route
authRouter.post('/signup', async (req, res) => {
    const { username, password, email, name, phone, address } = req.body;

    try {
        // Check if the user already exists
        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).send('Email is already registered');
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new user instance
        const newUser = new User({
            email,
            password: hashedPassword,
            name,
            phone,
            address
        });

        // Generate tokens
        const accessToken = newUser.generateAccessToken();
        const refreshToken = newUser.generateRefreshToken();
        newUser.refreshToken = refreshToken;

        // Save the user
        await newUser.save();

        // Return tokens and user info (except password)
        res.status(201).json({
            user: {
                id: newUser._id,
                email: newUser.email,
                name: newUser.name,
                phone: newUser.phone,
                address: newUser.address
            },
            accessToken,
            refreshToken
        });
    } catch (error) {
        console.log(error)
        res.status(500).send('Server error');
    }
});

authRouter.post("/login", async (req, res) => {
    try {

        const { email, password } = req.body
        const user = await User.findOne({
            email
        })
        const hasPassword = user.password
        const isValidPassword = await bcrypt.compare(password, hasPassword)
        if (!isValidPassword) {
            throw new Error("Invalid email or password!")
        }
        // 
        const accessToken = user.generateAccessToken();//our defined methods can be accesed using the user instance 
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken; // Save refresh token in the database
        
        await user.save(); // Save user with new refresh token
        res.json({
            status: 'success',
            message: "Login Successful!",
            accessToken, 
            refreshToken,
        });
    } catch (error) {
        res.status(400).send("ERROR: " + error.message)
    }
})

// Logout route to invalidate refresh token
authRouter.post('/logout', userAuth, async (req, res) => {
    const { refreshToken } = req.body;
  
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }
  
    try {
      // Verify the refresh token
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET_KEY);
  
      // Find the user by ID and check the refresh token
      const user = await User.findById(decoded.id);
  
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(403).json({ message: 'Invalid refresh token' });
      }
  
      // Invalidate the refresh token by removing it from the user
      user.refreshToken = null; // or use '' (empty string) to invalidate the token
      await user.save();
  
      // Respond with success
      res.status(200).json({ message: 'Successfully logged out' });
    } catch (error) {
      return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }
  });

// Rotate Access Token using Refresh Token
authRouter.post('/token/rotate', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
    }

    try {
        // Verify the refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET_KEY);

        // Find the user by ID and ensure the refresh token matches the stored one
        const user = await User.findById(decoded._id);

        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }

        // Generate a new access token
        const newAccessToken = jwt.sign(
            { _id: user._id, email: user.email, role: user.role },
            process.env.ACCESS_TOKEN_SECRET_KEY,
            { expiresIn: '15m' }
        );

        // Generate a new refresh token to rotate it
        const newRefreshToken = jwt.sign(
            { _id: user._id, email: user.email },
            process.env.REFRESH_TOKEN_SECRET_KEY,
            { expiresIn: '7d' }
        );

        // Save the new refresh token in the user document
        user.refreshToken = newRefreshToken;
        await user.save();

        // Send the new tokens to the user
        res.status(200).json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }
});

module.exports = authRouter