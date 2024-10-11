const mongoose = require('mongoose');

// Define the schema for invoice items
const InvoiceItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }, // Price at the time of purchase
});

// Define the main invoice schema
const InvoiceSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // The user who is being invoiced
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true }, // The order that this invoice corresponds to
    items: [InvoiceItemSchema], // Items being invoiced
    billingAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true }
    },
    totalPrice: { type: Number, required: true }, // Total amount due
    taxAmount: { type: Number, required: true }, // Tax on the total amount
    shippingPrice: { type: Number, required: true }, // Shipping costs
    grandTotal: { type: Number, required: true }, // Total amount after tax and shipping
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' }, // Payment status
    invoiceDate: { type: Date, default: Date.now }, // Invoice creation date
    dueDate: { type: Date }, // Payment due date
    paidAt: { type: Date }, // Date when payment was made
}, {
    timestamps: true, // Automatically manage createdAt and updatedAt fields
});

module.exports = mongoose.model('Invoice', InvoiceSchema);