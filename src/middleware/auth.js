const jwt = require("jsonwebtoken");
const User = require("../models/user");
// const SECRET_KEY = "K74jdfP0*(7"

const userAuth = async (req, res, next) => {
  try {
    let authToken = req.headers["authorization"];
    if (!authToken) throw new Error("Invalid authorization");
    authToken = authToken.split(" ")[1];
    const decodeJWT = await jwt.verify(
      authToken,
      process.env.ACCESS_TOKEN_SECRET_KEY
    );
    const user = await User.findById(decodeJWT._id);
    if (!user) {
      throw new Error("User not found!");
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(400).send("ERROR: " + error.message);
  }
};

const adminAuth = async (req, res, next) => {
  try {
    // Check for Authorization header
    let authToken = req.headers["authorization"];
    if (!authToken) {
      throw new Error("Authorization token is missing");
    }

    // Extract the token from the "Bearer <token>" format
    authToken = authToken.split(" ")[1];

    // Verify the JWT token
    const decodedJWT = await jwt.verify(
      authToken,
      process.env.ACCESS_TOKEN_SECRET_KEY
    );

    // Find the user in the database
    const user = await User.findById(decodedJWT._id);
    if (!user) {
      throw new Error("User not found");
    }

    // Check if the user's role is 'admin'
    if (user.role !== "admin") {
      throw new Error("Access denied: Admins only");
    }

    // Attach user data to the request object
    req.user = user;

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    res
      .status(403)
      .json({ success: false, message: "Access denied", error: error.message });
  }
};

module.exports = {
  userAuth,
  adminAuth,
};
