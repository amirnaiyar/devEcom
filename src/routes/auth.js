const express = require("express");
const authRouter = express.Router();
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { userAuth } = require("../middleware/auth");
const { errorHandler } = require("../middleware/errorHandler");

// Transporter setup for sending emails (Configure with your credentials)
var transporter = nodemailer.createTransport({
  host: process.env.HOST,
  port: 587,
  auth: {
    user: process.env.USERNAME,
    pass: process.env.PASSWORD,
  },
});

// Signup route
authRouter.post("/signup", async (req, res) => {
  const { username, password, email, name, phone, address } = req.body;

  try {
    // Check if the user already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).send("Email is already registered");
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
      address,
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
        address: newUser.address,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).send("Server error: ", error);
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({
      email,
    });
    const hasPassword = user.password;
    const isValidPassword = await bcrypt.compare(password, hasPassword);
    if (!isValidPassword) {
      return res.status(404).json({ message: "Invalid email or password!" });
    }
    //
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save();
    res.json({
      status: "success",
      message: "Login Successful!",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(404).json({ message: "ERROR: " + error.message });
  }
});

authRouter.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Access denied!" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password!" });
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      status: "success",
      message: "Admin Login Successful!",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message });
  }
});

// Logout route to invalidate refresh token
authRouter.post("/logout", userAuth, async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token is required" });
  }

  try {
    // Verify the refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET_KEY
    );

    // Find the user by ID and check the refresh token
    const user = await User.findById(decoded._id);
    console.log(user);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // Invalidate the refresh token by removing it from the user
    user.refreshToken = null; // or use '' (empty string) to invalidate the token
    await user.save();

    // Respond with success
    res.status(200).json({ message: "Successfully logged out" });
  } catch (error) {
    return res
      .status(403)
      .json({ message: "Invalid or expired refresh token" });
  }
});

// Rotate Access Token using Refresh Token
authRouter.post("/token/rotate", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token is required" });
  }

  try {
    // Verify the refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET_KEY
    );
    // Find the user by ID and ensure the refresh token matches the stored one
    const user = await User.findById(decoded._id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // Generate a new access token
    const newAccessToken = jwt.sign(
      { _id: user._id, email: user.email, role: user.role },
      process.env.ACCESS_TOKEN_SECRET_KEY,
      { expiresIn: "15m" }
    );

    // Generate a new refresh token to rotate it
    const newRefreshToken = jwt.sign(
      { _id: user._id, email: user.email },
      process.env.REFRESH_TOKEN_SECRET_KEY,
      { expiresIn: "7d" }
    );

    // Save the new refresh token in the user document
    user.refreshToken = newRefreshToken;
    await user.save();

    // Send the new tokens to the user
    res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return res
      .status(403)
      .json({ message: "Invalid or expired refresh token" });
  }
});

// Forgot Password Route
authRouter.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate reset token and expiration time
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hash = await bcrypt.hash(resetToken, 10); // Hash the token for security

    user.resetPasswordToken = hash;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
    await user.save();

    // Send password reset email
    const resetUrl = `https://ecom-reset.vercel.app/reset-password?token=${resetToken}&email=${email}`;

    const mailOptions = {
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: "Password Reset",
      html: `
          <h1>Password Reset Request</h1>
          <p>You requested to reset your password. Click the link below to reset it:</p>
          <a href="${resetUrl}">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
        `,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      message: "Password reset link sent to your email",
      data: resetUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Reset Password Route
authRouter.post("/reset-password", async (req, res) => {
  const { token, email, password } = req.body;
  try {
    const user = await User.findOne({
      email,
      resetPasswordExpires: { $gt: Date.now() }, // Check if the token is still valid
    });

    if (!user) {
      return res
        .status(401)
        .json({ status: "error", message: "Invalid or expired token" });
    }

    // Compare the token with the stored hash
    const isValid = await bcrypt.compare(token, user.resetPasswordToken);
    if (!isValid) {
      return res
        .status(401)
        .json({ status: "error", message: "Invalid token" });
    }
    // Hash and save the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined; // Clear the token
    user.resetPasswordExpires = undefined; // Clear the expiration time
    await user.save();
    res.json({ status: "success", message: "Password successfully reset" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

authRouter.get("/token", (req, res) => {
  console.log("coming here");
  try {
    // Read the 'appSession' cookie
    const appSession = req.cookies.appSession;

    if (!appSession) {
      return res.status(401).json({ error: "Session cookie not found" });
    }

    // Decode and verify the JWT
    const secret = process.env.JWT_SECRET;
    console.log(secret, "secret");
    const decodedToken = jwt.verify(appSession, secret);
    console.log(decodedToken, "decodedToken");
    // Return the access token
    return res.status(200).json({ accessToken: decodedToken });
  } catch (error) {
    console.error("Error decoding token:", error.message);
    return res.status(500).json({ error: "Invalid token or server error" });
  }
});

module.exports = authRouter;
