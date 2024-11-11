const express = require('express');
const { Order } = require('../models/order');
const Coupon = require('../models/coupon');
const Product = require('../models/product');
const { userAuth } = require('../middleware/auth');
const orderRouter = express.Router();

// Create a new order
orderRouter.post('/create', userAuth, async (req, res) => {
    const { items, totalPrice, paymentMethod, shippingAddress, couponCode } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'No order items found' });
    }

    try {
        let discountAmount = 0;
        let finalAmount = totalPrice;
        let appliedCoupon = null;

        // Apply coupon discount if couponCode is provided
        if (couponCode) {
            const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
            if (!coupon) {
                return res.status(400).json({ message: 'Invalid or inactive coupon code' });
            }
            if (coupon.expirationDate && new Date() > coupon.expirationDate) {
                return res.status(400).json({ message: 'Coupon code has expired' });
            }
            if (totalPrice < coupon.minimumOrderValue) {
                return res.status(400).json({ message: `Minimum order value for coupon is ${coupon.minimumOrderValue}` });
            }

            // Calculate discount based on type
            if (coupon.discountType === 'percentage') {
                discountAmount = (totalPrice * coupon.discountValue) / 100;
            } else if (coupon.discountType === 'flat') {
                discountAmount = coupon.discountValue;
            }

            finalAmount = totalPrice - discountAmount;
            // Set the applied coupon
            appliedCoupon = coupon._id;
        }

        // Validate and update stock for each product with selected size/color options
        const validatedItems = await Promise.all(items.map(async (item) => {
            const product = await Product.findById(item.productId);
            if (!product || !product.isActive) {
                throw new Error(`Product with ID ${item.productId} is not available`);
            }

            // Check if size option is selected and has stock
            if (item.size) {
                const sizeOption = product.sizes.find((s) => s.size.equals(item.size));
                if (!sizeOption || sizeOption.stock < item.quantity) {
                    throw new Error(`Insufficient stock for size selection of product ${product.name}`);
                }
                // Update stock
                sizeOption.stock -= item.quantity;
            }

            // Check if color option is selected and has stock
            if (item.color) {
                const colorOption = product.colors.find((c) => c.color.equals(item.color));
                if (!colorOption || colorOption.stock < item.quantity) {
                    throw new Error(`Insufficient stock for color selection of product ${product.name}`);
                }
                // Update stock
                colorOption.stock -= item.quantity;
            }

            // Decrease product stock if no specific size/color options
            if (!item.size && !item.color) {
                if (product.stock < item.quantity) {
                    throw new Error(`Insufficient stock for product ${product.name}`);
                }
                product.stock -= item.quantity;
            }

            await product.save();
            return {
                product: item.productId,
                quantity: item.quantity,
                price: product.sellingPrice || product.price, // Use selling price if available
                color: item.color, // Include color in the order item
                size: item.size,   // Include size in the order item
            };
        }));

        // Create and save the new order
        const newOrder = new Order({
            user: req.user.id,
            items: validatedItems,
            totalPrice,
            discountAmount,
            finalAmount,
            paymentMethod,
            shippingAddress,
            coupon: appliedCoupon,
        });

        const savedOrder = await newOrder.save();
        res.status(201).json(savedOrder);

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Error creating order', error: error.message });
    }
});

// Get all orders of a user
// orderRouter.get('/', userAuth, async (req, res) => {
//     try {
//         const orders = await Order.find({ user: req.user.id }).populate('items.product', 'name price');
//         res.status(200).json(orders);
//     } catch (error) {
//         res.status(500).json({ message: 'Error fetching orders', error });
//     }
// });

// Get a specific order by ID
orderRouter.get('/', userAuth, async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)
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
            .populate('coupon');

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



orderRouter.get("/my-orders", userAuth, async (req, res) => {
    try {
        // Find orders where the user ID matches the logged-in user's ID
        const orders = await Order.find({ user: req.user.id })
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
            .populate('coupon')
            .sort({ createdAt: -1 });  // sort by creation date, newest first
        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: "No orders found for this user" });
        }

        res.json({
            status: "success",
            message: "User orders fetched successfully",
            data: orders
        });
    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).json({ message: "Server error fetching orders", error: error.message });
    }
});

// Delete an order (admin/owner only)
// orderRouter.delete('/:orderId', userAuth, async (req, res) => {
//     try {
//         const order = await Order.findById(req.params.orderId);
//         if (!order) {
//             return res.status(404).json({ message: 'Order not found' });
//         }

//         // Only the admin or the order owner can delete the order
//         if (order.user.toString() !== req.user.id && !req.user.isAdmin) {
//             return res.status(403).json({ message: 'Not authorized to delete this order' });
//         }

//         await order.remove();
//         res.status(200).json({ message: 'Order deleted successfully' });
//     } catch (error) {
//         res.status(500).json({ message: 'Error deleting order', error });
//     }
// });

module.exports = orderRouter;