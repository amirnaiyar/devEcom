const express = require('express');
const Product = require('../models/product');
const productRouter = express.Router();

// Create a new product
productRouter.post('/', async (req, res) => {
    try {
        const { name, description, price, stock, category, brand, images } = req.body;
        const product = new Product({ name, description, price, stock, category, brand, images });
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ message: 'Error creating product', error });
    }
});




module.exports = productRouter