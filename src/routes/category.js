const express = require('express');
const Category = require('../models/category');
const categoryRouter = express.Router();

// Create a new category
categoryRouter.post('/', async (req, res) => {
    try {
        const { name, description, slug } = req.body;
        const category = new Category({ name, description, slug });
        await category.save();
        res.status(201).json(category);
    } catch (error) {
        if (error.code === 11000) { // Handling unique constraint error for 'name' or 'slug'
            return res.status(400).json({ message: 'Category name or slug must be unique', error });
        }
        res.status(400).json({ message: 'Error creating category', error });
    }
});

// Get all categories
categoryRouter.get('/', async (req, res) => {
    try {
        const categories = await Category.find();
        res.status(200).json(categories);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching categories', error });
    }
});

// Get a category by ID
categoryRouter.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.status(200).json(category);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching category', error });
    }
});

// Update a category
categoryRouter.put('/:id', async (req, res) => {
    try {
        const { name, description, slug } = req.body;
        const category = await Category.findByIdAndUpdate(req.params.id, { name, description, slug }, { new: true });
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.status(200).json(category);
    } catch (error) {
        if (error.code === 11000) { // Handling unique constraint error for 'name' or 'slug'
            return res.status(400).json({ message: 'Category name or slug must be unique', error });
        }
        res.status(400).json({ message: 'Error updating category', error });
    }
});

// Delete a category
categoryRouter.delete('/:id', async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error deleting category', error });
    }
});

// Get a category by slug
categoryRouter.get('/slug/:slug', async (req, res) => {
    try {
        const category = await Category.findOne({ slug: req.params.slug });
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.status(200).json(category);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching category', error });
    }
});




module.exports = categoryRouter;