const express = require('express');
const Invoice = require('../models/invoice');
const {Order} = require('../models/Order');
const { userAuth } = require('../middleware/auth');
const invoiceRouter = express.Router();

// Create a new invoice for an order
invoiceRouter.post('/create', userAuth, async (req, res) => {
    const { orderId, items, billingAddress, totalPrice, taxAmount, shippingPrice, grandTotal, dueDate } = req.body;

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const newInvoice = new Invoice({
            user: req.user.id,
            order: orderId,
            items,
            billingAddress,
            totalPrice,
            taxAmount,
            shippingPrice,
            grandTotal,
            dueDate,
        });

        const savedInvoice = await newInvoice.save();
        res.status(201).json(savedInvoice);
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Error creating invoice', error });
    }
});

// Get all invoices for the logged-in user
invoiceRouter.get('/', userAuth, async (req, res) => {
    try {
        const invoices = await Invoice.find({ user: req.user.id }).populate('order items.product', 'name price');
        res.status(200).json(invoices);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching invoices', error });
    }
});

// Get a specific invoice by ID
invoiceRouter.get('/:invoiceId', userAuth, async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.invoiceId)
            .populate('order items.product', 'name price');

        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        // Ensure the invoice belongs to the logged-in user
        if (invoice.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to view this invoice' });
        }

        res.status(200).json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching invoice', error });
    }
});

// Update payment status for an invoice (admin/owner only)
invoiceRouter.put('/payment/:invoiceId', userAuth, async (req, res) => {
    const { paymentStatus, paidAt } = req.body;

    try {
        const invoice = await Invoice.findById(req.params.invoiceId);
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        // Only the admin or the invoice owner can update payment status
        if (invoice.user.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized to update this invoice' });
        }

        if (paymentStatus) invoice.paymentStatus = paymentStatus;
        if (paidAt) invoice.paidAt = paidAt;

        await invoice.save();
        res.status(200).json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Error updating invoice', error });
    }
});

// Delete an invoice (admin/owner only)
invoiceRouter.delete('/:invoiceId', userAuth, async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.invoiceId);
        if (!invoice) {
            return res.status(404).json({ message: 'Invoice not found' });
        }

        // Only the admin or the invoice owner can delete the invoice
        if (invoice.user.toString() !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Not authorized to delete this invoice' });
        }

        await invoice.remove();
        res.status(200).json({ message: 'Invoice deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting invoice', error });
    }
});

module.exports = invoiceRouter;