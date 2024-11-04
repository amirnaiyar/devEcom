const express = require('express');
const Product = require('../models/product');
const productRouter = express.Router();

// Create a new product
productRouter.post('/', async (req, res) => {
    try {
        const { name, description, price, sellingPrice, stock, category, subcategory, brand, images } = req.body;
        const product = new Product({ name, description, price, sellingPrice, stock, category, subcategory, brand, images });
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ message: 'Error creating product', error });
    }
});

productRouter.get('/', async (req, res) => {
    try {
        const { id } = req.body;
        const product = await Product.findById(id);
        if(product){
            res.status(201).json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(400).json({ message: 'Error fetching product', error });
    }
});




module.exports = productRouter