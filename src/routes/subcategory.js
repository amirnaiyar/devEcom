const express = require('express');
const Subcategory = require('../models/subcategory');
const Category = require('../models/category');
const Product = require('../models/product');
const User = require("../models/user")
const { userAuth } = require('../middleware/auth');
const subcategoryRouter = express.Router();

// Create a new category
subcategoryRouter.post("/", async (req, res) => {
    const { name, slug, description, categoryId } = req.body;
  
    try {
      // Check if the category exists
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
  
      // Create a new subcategory
      const subcategory = new Subcategory({
        name,
        slug,
        description,
        category: categoryId,
      });
  
      await subcategory.save();
  
      // Add subcategory to the category's subcategories array
      category.subcategories.push(subcategory._id);
      await category.save();
  
      res.status(201).json({
        message: "Subcategory created successfully",
        subcategory,
      });
    } catch (error) {
      res.status(500).json({ message: "Error creating subcategory", error });
    }
  });

// Get all products by subcategory
subcategoryRouter.get("/:subcategoryId/products", userAuth, async (req, res) => {
  const subcategoryId = req.params.subcategoryId;
  const sortOption = req.query.sort; // Get sorting option from query parameters
  try {
      // Fetch the subcategory and populate the main category (optional)
      const subcategory = await Subcategory.findById(subcategoryId).populate("category", "name");
      if (!subcategory) {
          return res.status(404).json({ message: "Subcategory not found" });
      }

      // Define sorting logic
      let sortCriteria = {};
      switch (sortOption) {
          case "popular":
              sortCriteria = { rating: -1 }; // Sort by average rating (highest first)
              break;
          case "newest":
              sortCriteria = { createdAt: -1 }; // Sort by creation date (newest first)
              break;
          case "customer_review":
              sortCriteria = { reviews: -1 }; // Assuming 'reviews' contains the count of reviews
              break;
          case "price_low_to_high":
              sortCriteria = { sellingPrice: 1 }; // Sort by selling price (lowest first)
              break;
          case "price_high_to_low":
              sortCriteria = { sellingPrice: -1 }; // Sort by selling price (highest first)
              break;
          default:
              sortCriteria = {}; // Default sort (no sorting)
              break;
      }

      // Fetch all products associated with this subcategory
      const products = await Product.find({ 
          subcategory: subcategoryId, 
          isActive: true 
      })
      .populate("category", "name")
      .populate("sizes.size", "size") // Populate size details if needed
      .populate("colors.color", "name") // Populate color details if needed
      .populate("reviews", "rating") // Populate reviews if needed
      .sort(sortCriteria);
    
      // If the user is authenticated, get their wishlist
      let userWishlist = [];
      if (req.user) {
          const user = await User.findById(req.user._id).select("wishlist");
          if (user) {
              userWishlist = user.wishlist.map((item) => item.toString());
          }
      }

      // Add the isWishlisted flag and calculated fields to each product
      const updatedProducts = products.map((product) => ({
          ...product.toObject(), // Convert Mongoose document to plain object
          isWishlisted: userWishlist.includes(product._id.toString()),
          hasDiscount: product.sellingPrice < product.price // Calculate if the product has a discount
      }));

      res.status(200).json({
          name: subcategory.name,
          products: updatedProducts,
      });
  } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error fetching products for the subcategory", error });
  }
});


module.exports = subcategoryRouter;