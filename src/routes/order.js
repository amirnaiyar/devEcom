const express = require('express');
const {Order} = require('../models/order');
const { userAuth } = require('../middleware/auth');
const orderRouter = express.Router();

// Create a new order
orderRouter.post('/create', userAuth, async (req, res) => {
    const { items, totalPrice, paymentMethod, shippingAddress } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'No order items found' });
    }

    try {
        const newOrder = new Order({
            user: req.user.id,
            items,
            totalPrice,
            paymentMethod,
            shippingAddress,
        });

        const savedOrder = await newOrder.save();
        res.status(201).json(savedOrder);
    } catch (error) {
        console.log(error.message);
        res.status(500).json({ message: 'Error creating order', error });
    }
});

// Get all orders of a user
orderRouter.get('/', userAuth, async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user.id }).populate('items.product', 'name price');
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error });
    }
});

// Get a specific order by ID
orderRouter.get('/:orderId', userAuth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId).populate('items.product', 'name price');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if the order belongs to the current user
        if (order.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to view this order' });
        }

        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching order', error });
    }
});

// Update order status (admin/owner only)
orderRouter.put('/status/:orderId', userAuth, async (req, res) => {
    const { orderStatus, paymentStatus } = req.body;

    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Only the admin or the order owner can update status
        if (order.user.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized to update this order' });
        }

        if (orderStatus) order.orderStatus = orderStatus;
        if (paymentStatus) order.paymentStatus = paymentStatus;

        await order.save();
        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({ message: 'Error updating order status', error });
    }
});

// Delete an order (admin/owner only)
orderRouter.delete('/:orderId', userAuth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Only the admin or the order owner can delete the order
        if (order.user.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized to delete this order' });
        }

        await order.remove();
        res.status(200).json({ message: 'Order deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting order', error });
    }
});

module.exports = orderRouter;