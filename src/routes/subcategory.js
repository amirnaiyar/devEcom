const express = require('express');
const Subcategory = require('../models/subcategory');
const Category = require('../models/category');
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
subcategoryRouter.get('/', async (req, res) => {
    const subcategoryName = req.params.name;

  try {
    const subcategories = await Subcategory.find({ name: subcategoryName })
      .populate("category", "name"); // Populate category name if needed

    res.status(200).json(subcategories);
  } catch (error) {
    res.status(500).json({ message: "Error fetching subcategories", error });
  }
});






module.exports = subcategoryRouter;