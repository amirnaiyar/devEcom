const express = require("express");
const Review = require("../models/review");
const Product = require("../models/product");
const { userAuth } = require("../middleware/auth");
const reviewRouter = express.Router();

// Middleware to get the authenticated user's ID (assumes a user object is added to the request by authentication middleware)
const getUserReviews = async (req, res) => {
  try {
    const userId = req.user._id; // Assuming `req.user` contains authenticated user's details
    const reviews = await Review.find({ user: userId })
      .populate(
        "product",
        "name price brand colors sizes images description createdAt"
      ) // Populate product details (adjust fields as needed)
      .sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
};

// reviewRouter.get("/my-reviews", userAuth, getUserReviews);
reviewRouter.get("/my-reviews", userAuth, getUserReviews);
// Get all reviews for a product
reviewRouter.get("/:productId", async (req, res) => {
  try {
    const reviews = await Review.find({
      product: req.params.productId,
    }).populate("user", "name");
    res.status(200).json(reviews);
  } catch (error) {
    res.status(400).json({ message: "Error fetching reviews", error });
  }
});

// Add a review for a product
reviewRouter.post("/add", userAuth, async (req, res) => {
  const { productId, rating, comment } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: "Product not found" });

    // Check if the user has already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user._id,
    });
    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this product" });
    }

    const review = new Review({
      product: productId,
      user: req.user._id,
      rating,
      comment,
    });

    await review.save();

    // Optionally, you could update the product's average rating here

    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ message: "Error adding review", error });
  }
});

// Update a review
reviewRouter.put("/update/:reviewId", userAuth, async (req, res) => {
  const { rating, comment } = req.body;

  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });

    // Check if the review belongs to the user
    if (review.user.toString() !== req.user._id) {
      return res
        .status(403)
        .json({ message: "You can only update your own reviews" });
    }

    // Update review fields
    if (rating) review.rating = rating;
    if (comment) review.comment = comment;

    await review.save();
    res.status(200).json(review);
  } catch (error) {
    res.status(400).json({ message: "Error updating review", error });
  }
});

// Delete a review
reviewRouter.delete("/delete/:reviewId", userAuth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });

    // Check if the review belongs to the user
    if (review.user.toString() !== req.user._id) {
      return res
        .status(403)
        .json({ message: "You can only delete your own reviews" });
    }

    await review.remove();

    // Optionally, you could update the product's average rating here

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Error deleting review", error });
  }
});

module.exports = reviewRouter;
