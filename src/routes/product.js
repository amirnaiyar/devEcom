const express = require('express');
const Product = require('../models/product');
const productRouter = express.Router();

// Create a new product
productRouter.post('/', async (req, res) => {
    try {
        const { name, description, price, sellingPrice, stock, category, subcategory, brand, images,  sizes, colors } = req.body;
        const product = new Product({ name, description, price, sellingPrice, stock, category, subcategory, brand, images, sizes, colors });
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ message: 'Error creating product', error });
    }
});

productRouter.post('/batch', async (req, res) => {
    try {
        const products = req.body.products; // Expecting an array of products
        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: 'Invalid input: please provide an array of products.' });
        }

        // Map through the products array to create and save each product
        const savedProducts = await Promise.all(products.map(async (productData) => {
            const { name, description, price, sellingPrice, stock, category, subcategory, brand, images, hasSize, sizes, hasColor, colors } = productData;
            const product = new Product({ name, description, price, sellingPrice, stock, category, subcategory, brand, images, hasSize, sizes, hasColor, colors });
            return await product.save();
        }));

        res.status(201).json(savedProducts);
    } catch (error) {
        res.status(400).json({ message: 'Error creating products', error });
    }
});


productRouter.get('/new', async (req, res) => {
    try {
        // Get the limit from the query parameters or set a default limit
        const limit = parseInt(req.query.limit) || 10;

        // Fetch products sorted by creation date in descending order
        const products = await Product.find({ isActive: true }) // Only active products
            .sort({ createdAt: -1 }) // Sort by newest first
            .limit(limit) // Limit the number of products
            .populate('category subcategory') // Populate category and subcategory references
            .populate('sizes.size') // Populate size references if needed
            .populate('colors.color'); // Populate color references if needed

        res.status(200).json(products);
    } catch (error) {
        console.error("Error fetching new products:", error);
        res.status(500).json({ message: "Error fetching new products", error });
    }
});


productRouter.get('/sale', async (req, res) => {
    try {
        // Get the limit from the query parameters or set a default limit
        const limit = parseInt(req.query.limit) || 10;

        // Fetch sale products (where sellingPrice is less than the original price)
        const saleProducts = await Product.find({
                isActive: true, // Only active products
                sellingPrice: { $lt: "$price" } // Products on sale
            })
            .sort({ createdAt: -1 }) // Sort by newest first
            .limit(limit) // Limit the number of sale products
            .populate('category subcategory') // Populate category and subcategory references
            .populate('sizes.size') // Populate size references if needed
            .populate('colors.color'); // Populate color references if needed

        res.status(200).json(saleProducts);
    } catch (error) {
        console.error("Error fetching sale products:", error);
        res.status(500).json({ message: "Error fetching sale products", error });
    }
});

productRouter.get('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const product = await Product.findById(id)
        .populate({
            path: 'colors.color', // Populate the color field in colors array
            model: 'Color', // Reference to the Color collection
            select: 'name displayName hexCode' // Select fields to include
        })
        .populate({
            path: 'sizes.size', // Populate the size field in sizes array
            model: 'Size', // Reference to the Size collection
            select: 'name displayName displayOrder' // Select fields to include
        });
        // check product is Active
        if(!product.isActive){
            return res.status(400).json({ message: 'No Product Found!' });
        }
        if(!product.stock || product.stock === 0){
            return res.status(400).json({ message: 'No stock available for this product!' });
        }
        if(product){
            res.status(201).json(product);
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        console.log(error, 'error')
        res.status(400).json({ message: 'Error fetching product', error });
    }
});




module.exports = productRouter