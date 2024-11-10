const express = require('express');
const Subcategory = require('../models/subcategory');
const Category = require('../models/category');
const Product = require('../models/product');
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
subcategoryRouter.get("/:subcategoryId/products", async (req, res) => {
    const subcategoryId = req.params.subcategoryId;
  
    try {
      // Fetch the subcategory and populate the main category (optional)
      const subcategory = await Subcategory.findById(subcategoryId).populate("category", "name");
      if (!subcategory) {
        return res.status(404).json({ message: "Subcategory not found" });
      }
  
      // Fetch all products associated with this subcategory
      const products = await Product.find({ subcategory: subcategoryId, isActive: true }).populate("category", "name");
  
      res.status(200).json({
        name: subcategory.name,
        products,
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error fetching products for the subcategory", error });
    }
  });


module.exports = subcategoryRouter;