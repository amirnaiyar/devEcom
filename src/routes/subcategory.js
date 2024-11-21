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

// Get all categories
subcategoryRouter.get("/:subcategoryId/products", userAuth, async (req, res) => {
    const subcategoryId = req.params.subcategoryId;
  
    try {
      // Fetch the subcategory and populate the main category (optional)
      const subcategory = await Subcategory.findById(subcategoryId).populate("category", "name");
      if (!subcategory) {
        return res.status(404).json({ message: "Subcategory not found" });
      }
  
      // Fetch all products associated with this subcategory
      const products = await Product.find({ subcategory: subcategoryId, isActive: true }).populate("category", "name");
      
      // If the user is authenticated, get their wishlist
      if (req.user) {
        const user = await User.findById(req.user._id).select('wishlist');
        if (user) {
            userWishlist = user.wishlist.map((item) => item.toString());
        }
    }
      // Add the isWishlisted flag to each product
      const updatedProducts = products.map((product) => ({
        ...product.toObject(), // Convert Mongoose document to plain object
        isWishlisted: userWishlist.includes(product._id.toString()),
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