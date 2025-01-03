const mongoose = require('mongoose')

const OrderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },  // Price at the time of purchase
    color: { type: mongoose.Schema.Types.ObjectId, ref: 'Color' },  // Reference to Color
    size: { type: mongoose.Schema.Types.ObjectId, ref: 'Size' }
  });
  
  const OrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [OrderItemSchema],
    totalPrice: { type: Number, required: true },  // Total price of the order
    paymentMethod: { type: String, enum: ['credit_card', 'upi', 'cash_on_delivery'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    orderStatus: { type: String, enum: ['pending', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },  // Reference to applied coupon
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: String
    },
  }, {
    timestamps: true,
  });

  const OrderItem = mongoose.model('OrderItem', OrderItemSchema);
  const Order = mongoose.model('Order', OrderSchema);

  module.exports = {
    OrderItem,
    Order
  };