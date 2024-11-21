const express = require('express')
const cartRouter = express.Router()
const { userAuth } = require("../middleware/auth")
const {Cart} = require('../models/cart')
const Product = require('../models/product')

// Get cart for the authenticated user
cartRouter.get('/', userAuth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user._id })
            .populate({
                path: 'items.product',
                model: 'Product',
                populate: [
                    {
                        path: 'colors.color',
                        model: 'Color',
                        select: 'name displayName hexCode'
                    },
                    {
                        path: 'sizes.size',
                        model: 'Size',
                        select: 'name displayName displayOrder'
                    }
                ]
            })
            .populate({
                path: 'items.color', // Populate the specific color for this cart item
                model: 'Color',
                select: 'name displayName hexCode'
            })
            .populate({
                path: 'items.size', // Populate the specific size for this cart item
                model: 'Size',
                select: 'name displayName displayOrder'
            })
            .populate({
                path: 'appliedCoupon', // Populate the applied coupon
                model: 'Coupon',
                select: 'code discountType discountValue expirationDate isActive'
            });

            if (!cart) return res.json({ cart: [], message: 'Cart not found' });

        res.status(200).json(cart);
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(400).json({ message: 'Error fetching cart', error });
    }
});



// Add item to cart or update quantity if the item already exists
cartRouter.post('/add', userAuth, async (req, res) => {
    const { productId, quantity, sizeId, colorId } = req.body;

    try {
        const product = await Product.findById(productId).populate('sizes.size').populate('colors.color');

        if (!product) return res.status(404).json({ message: 'Product not found' });

        // Check if size and color are required and validate availability
        let availableStock = product.stock; // Default to main product stock

        if (sizeId) {
            const sizeOption = product.sizes.find(s => s.size._id.toString() === sizeId);
            if (!sizeOption) return res.status(400).json({ message: 'Selected size not available' });
            availableStock = sizeOption.stock; // Use size-specific stock
        }

        if (colorId) {
            const colorOption = product.colors.find(c => c.color._id.toString() === colorId);
            if (!colorOption) return res.status(400).json({ message: 'Selected color not available' });
            availableStock = colorOption.stock; // Use color-specific stock if it overrides size stock
        }

        if (quantity > availableStock) return res.status(400).json({ message: 'Requested quantity exceeds available stock' });

        // Find or create the cart
        let cart = await Cart.findOne({ user: req.user._id });

        if (!cart) {
            cart = new Cart({
                user: req.user._id,
                items: [{ product: productId, quantity, size: sizeId, color: colorId }]
            });
        } else {
            // Check if the product with the specific size/color combination already exists in the cart
            const itemIndex = cart.items.findIndex(item =>
                item.product.toString() === productId &&
                (sizeId ? item.size && item.size.toString() === sizeId : !item.size) &&
                (colorId ? item.color && item.color.toString() === colorId : !item.color)
            );

            if (itemIndex > -1) {
                // Product with specific size/color exists, update quantity
                cart.items[itemIndex].quantity += quantity;
            } else {
                // Product with specific size/color does not exist, add new item
                cart.items.push({ product: productId, quantity, size: sizeId, color: colorId });
            }
        }

        // Calculate total price if you have a method for it
        await cart.calculateTotalPrice();
        await cart.save();
        // Re-fetch the updated cart with populated fields
        const updatedCart = await Cart.findOne({ user: req.user._id })
        .populate({
            path: 'items.product',
            model: 'Product',
            populate: [
                {
                    path: 'colors.color',
                    model: 'Color',
                    select: 'name displayName hexCode'
                },
                {
                    path: 'sizes.size',
                    model: 'Size',
                    select: 'name displayName displayOrder'
                }
            ]
        })
        .populate({
            path: 'items.color', // Populate the specific color for this cart item
            model: 'Color',
            select: 'name displayName hexCode'
        })
        .populate({
            path: 'items.size', // Populate the specific size for this cart item
            model: 'Size',
            select: 'name displayName displayOrder'
        })
        .populate({
            path: 'appliedCoupon', // Populate the applied coupon
            model: 'Coupon',
            select: 'code discountType discountValue expirationDate isActive'
        });
        
        res.status(200).json({cart: updatedCart});
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: 'Error adding item to cart', error });
    }
});

// Remove item from cart
cartRouter.delete('/remove/:productId', userAuth, async (req, res) => {
    const { productId } = req.params;
    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.json({ cart: [], message: 'Cart not found' });

        // Remove item from cart
        cart.items = cart.items.filter(item => item.product.toString() !== productId);
        const cartTotal = await cart.calculateTotalPrice();
        if (!cartTotal) {
            return res.status(200).json({ message: 'Cart is empty and has been deleted' });
        }
         // Re-fetch the updated cart with populated fields
         const updatedCart = await Cart.findOne({ user: req.user._id })
         .populate({
             path: 'items.product',
             model: 'Product',
             populate: [
                 {
                     path: 'colors.color',
                     model: 'Color',
                     select: 'name displayName hexCode'
                 },
                 {
                     path: 'sizes.size',
                     model: 'Size',
                     select: 'name displayName displayOrder'
                 }
             ]
         })
         .populate({
             path: 'items.color', // Populate the specific color for this cart item
             model: 'Color',
             select: 'name displayName hexCode'
         })
         .populate({
             path: 'items.size', // Populate the specific size for this cart item
             model: 'Size',
             select: 'name displayName displayOrder'
         })
         .populate({
             path: 'appliedCoupon', // Populate the applied coupon
             model: 'Coupon',
             select: 'code discountType discountValue expirationDate isActive'
         });

        res.status(200).json({cart: updatedCart});
    } catch (error) {
        console.log(error)
        res.status(400).json({ message: 'Error removing item from cart', error });
    }
});

// Update quantity of an item in the cart
cartRouter.put('/update/:productId', userAuth, async (req, res) => {
    const { productId } = req.params;
    const { quantity, colorId, sizeId } = req.body;
    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart) return res.status(404).json({ message: 'Cart not found' });

        // Find the item based on productId, colorId, and sizeId (if provided)
        const itemIndex = cart.items.findIndex(item => 
            item.product.toString() === productId &&
            (!colorId || item.color?.toString() === colorId) &&
            (!sizeId || item.size?.toString() === sizeId)
        );

        if (itemIndex > -1) {
            // Update quantity for the exact variant of the product
            cart.items[itemIndex].quantity = quantity;
        } else {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        // Recalculate the total price after updating the quantity
        await cart.calculateTotalPrice();
        await cart.save();
        // Re-fetch the updated cart with populated fields
        const updatedCart = await Cart.findOne({ user: req.user._id })
            .populate({
                path: 'items.product',
                model: 'Product',
                populate: [
                    {
                        path: 'colors.color',
                        model: 'Color',
                        select: 'name displayName hexCode'
                    },
                    {
                        path: 'sizes.size',
                        model: 'Size',
                        select: 'name displayName displayOrder'
                    }
                ]
            })
            .populate({
                path: 'items.color', // Populate the specific color for this cart item
                model: 'Color',
                select: 'name displayName hexCode'
            })
            .populate({
                path: 'items.size', // Populate the specific size for this cart item
                model: 'Size',
                select: 'name displayName displayOrder'
            })
            .populate({
                path: 'appliedCoupon', // Populate the applied coupon
                model: 'Coupon',
                select: 'code discountType discountValue expirationDate isActive'
            });

        res.status(200).json({cart: updatedCart});
    } catch (error) {
        console.error(error);
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