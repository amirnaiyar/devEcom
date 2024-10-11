const express = require('express')
const cartRouter = express.Router()
const { userAuth } = require("../middleware/auth")
const {Cart} = require('../models/cart')
const Product = require('../models/product')

// Get cart for the authenticated user
cartRouter.get('/', userAuth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
        if (!cart) return res.status(404).json({ message: 'Cart not found' });
        res.status(200).json(cart);
    } catch (error) {
        res.status(400).json({ message: 'Error fetching cart', error });
    }
});

// Add item to cart or update quantity if the item already exists
cartRouter.post('/add', userAuth, async (req, res) => {
    const { productId, quantity } = req.body;

    try {
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        let cart = await Cart.findOne({ user: req.user._id });

        // If no cart exists, create a new one
        if (!cart) {
            cart = new Cart({ user: req.user._id, items: [{ product: productId, quantity }] });
        } else {
            // Check if the product already exists in the cart
            const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

            if (itemIndex > -1) {
                // Product exists, update quantity
                cart.items[itemIndex].quantity += quantity;
            } else {
                // Product does not exist, add new item
                cart.items.push({ product: productId, quantity });
            }
        }

        await cart.calculateTotalPrice();
        res.status(200).json(cart);
    } catch (error) {
        console.log(error)
        res.status(400).json({ message: 'Error adding item to cart', error });
    }
});

// Remove item from cart
cartRouter.delete('/remove/:productId', userAuth, async (req, res) => {
    const { productId } = req.params;

    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        // Remove item from cart
        cart.items = cart.items.filter(item => item.product.toString() !== productId);
        await cart.calculateTotalPrice();

        res.status(200).json(cart);
    } catch (error) {
        res.status(400).json({ message: 'Error removing item from cart', error });
    }
});

// Update quantity of an item in the cart
cartRouter.put('/update/:productId', userAuth, async (req, res) => {
    const { productId } = req.params;
    const { quantity } = req.body;

    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);
        if (itemIndex > -1) {
            // Update quantity
            cart.items[itemIndex].quantity = quantity;
        } else {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        await cart.calculateTotalPrice();
        res.status(200).json(cart);
    } catch (error) {
        res.status(400).json({ message: 'Error updating cart item', error });
    }
});

// Clear cart for the authenticated user
cartRouter.delete('/clear', userAuth, async (req, res) => {
    try {
        const cart = await Cart.findOneAndDelete({ user: req.user._id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });
        res.status(200).json({ message: 'Cart cleared successfully' });
    } catch (error) {
        res.status(400).json({ message: 'Error clearing cart', error });
    }
});

module.exports = cartRouter;