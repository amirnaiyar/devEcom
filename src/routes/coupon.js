// Import necessary modules
const express = require('express');
const couponRouter = express.Router();
const {Cart} = require('../models/cart');
const Coupon = require('../models/coupon');


// Create a new coupon
couponRouter.post('/createCoupon', async (req, res) => {
    const { code, discountType, discountValue, minimumOrderValue, expirationDate, isActive } = req.body;
  
    // Basic validation
    if (!code || !discountType || !discountValue) {
      return res.status(400).json({ message: 'Code, discount type, and discount value are required.' });
    }
  
    try {
      // Check if coupon with the same code already exists
      const existingCoupon = await Coupon.findOne({ code });
      if (existingCoupon) {
        return res.status(400).json({ message: 'Coupon code already exists.' });
      }
  
      // Create a new coupon
      const coupon = new Coupon({
        code,
        discountType,
        discountValue,
        minimumOrderValue,
        expirationDate,
        isActive
      });
  
      // Save the coupon to the database
      await coupon.save();
      res.status(201).json({ message: 'Coupon created successfully', coupon });
    } catch (error) {
      console.error('Error creating coupon:', error);
      res.status(500).json({ message: 'An error occurred while creating the coupon' });
    }
  });

  
// Apply coupon endpoint
couponRouter.post('/apply-coupon', async (req, res) => {
    try {
        const { cartId, couponCode } = req.body;

        // Find the cart
        const cart = await Cart.findById(cartId);
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // Find the coupon
        const coupon = await Coupon.findOne({ code: couponCode });
        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        // Check if the coupon is active and not expired
        const currentDate = new Date();
        if (!coupon.isActive || (coupon.expirationDate && coupon.expirationDate < currentDate)) {
            return res.status(400).json({ message: 'Coupon is inactive or expired' });
        }

        // Calculate total price and update the cart fields
        await cart.calculateTotalPrice();

        // Access updated cart total directly
        const cartTotal = cart.totalAmount;

        if (!cartTotal || isNaN(cartTotal)) {
            return res.status(400).json({ message: 'Invalid cart total' });
        }

        // Apply the coupon discount
        let discountAmount = 0;

        if (coupon.discountType === 'percentage') {
            discountAmount = cartTotal * (coupon.discountValue / 100);
        } else if (coupon.discountType === 'flat') {
            discountAmount = coupon.discountValue;
        }

        // Ensure discount does not exceed total cart value
        discountAmount = Math.min(discountAmount, cartTotal);

        // Update the cart with the applied coupon and discount amount
        cart.appliedCoupon = coupon._id;
        cart.discountAmount = discountAmount;
        cart.finalAmount = cartTotal - discountAmount;

        await cart.save();

        return res.status(200).json({
            message: 'Coupon applied successfully',
            cartTotal: cart.totalAmount,
            discountAmount: cart.discountAmount,
            finalAmount: cart.finalAmount,
            cart
        });
    } catch (error) {
        console.error('Error applying coupon:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

couponRouter.post('/remove-coupon', async (req, res) => {
    try {
        const { cartId } = req.body;

        // Find the cart
        const cart = await Cart.findById(cartId);
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // If no coupon is applied, return early
        if (!cart.appliedCoupon) {
            return res.status(400).json({ message: 'No coupon applied' });
        }

        // Remove the applied coupon and reset discount-related fields
        cart.appliedCoupon = null;
        cart.discountAmount = 0;
        cart.finalAmount = cart.totalAmount; // Revert final amount to total amount (before discount)

        // Save the updated cart
        await cart.save();

        return res.status(200).json({
            message: 'Coupon removed successfully',
            cartTotal: cart.totalAmount,
            finalAmount: cart.finalAmount,
            cart
        });
    } catch (error) {
        console.error('Error removing coupon:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});




module.exports = couponRouter;
