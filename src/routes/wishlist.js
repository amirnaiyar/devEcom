const express = require('express')
const wishlistRouter = express.Router();
const { userAuth } = require("../middleware/auth")
const Wishlist = require("../models/wishlist")
const Product = require("../models/product")
 
// Get wishlist for the authenticated user
wishlistRouter.get('/', userAuth, async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ user: req.user._id }).populate('products');
        if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });
        res.status(200).json(wishlist);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching wishlist', error });
    }
});

// Add product to wishlist
wishlistRouter.post('/add', userAuth, async (req, res) => {
    const { productId } = req.body;

    try {
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        let wishlist = await Wishlist.findOne({ user: req.user._id });

        // If no wishlist exists, create a new one
        if (!wishlist) {
            wishlist = new Wishlist({ user: req.user._id, products: [productId] });
        } else {
            // Check if product already exists in the wishlist
            if (wishlist.products.includes(productId)) {
                return res.status(400).json({ message: 'Product already in wishlist' });
            }

            // Add product to wishlist
            wishlist.products.push(productId);
        }

        await wishlist.save();
        res.status(200).json(wishlist);
    } catch (error) {
        console.log(error)
        res.status(400).json({ message: 'Error adding product to wishlist', error });
    }
});

// Remove product from wishlist
wishlistRouter.delete('/remove/:productId', userAuth, async (req, res) => {
    const { productId } = req.params;

    try {
        const wishlist = await Wishlist.findOne({ user: req.user._id });
        if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });

        // Remove product from wishlist
        wishlist.products = wishlist.products.filter(product => product.toString() !== productId);
        await wishlist.save();

        res.status(200).json(wishlist);
    } catch (error) {
        res.status(400).json({ message: 'Error removing product from wishlist', error });
    }
});

// Clear wishlist for the authenticated user
wishlistRouter.delete('/clear', userAuth, async (req, res) => {
    try {
        const wishlist = await Wishlist.findOneAndDelete({ user: req.user._id });
        if (!wishlist) return res.status(404).json({ message: 'Wishlist not found' });

        res.status(200).json({ message: 'Wishlist cleared successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error clearing wishlist', error });
    }
});

module.exports = wishlistRouter;