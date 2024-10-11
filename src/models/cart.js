
const mongoose = require("mongoose")

const CartItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1 }
  });
  
  const CartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [CartItemSchema],
    totalPrice: { type: Number, default: 0 }, // Calculated field
  }, {
    timestamps: true,
  });

  // Helper function to calculate total price
CartSchema.methods.calculateTotalPrice = async function () {
  const cart = this;
  let total = 0;

  await cart.populate('items.product'); // Populate product info
  cart.items.forEach(item => {
      total += item.product.price * item.quantity;
  });
  cart.totalPrice = total;
  await cart.save();
};



  const CartItem = mongoose.model('CartItem', CartItemSchema);
  const Cart = mongoose.model('Cart', CartSchema);

module.exports = {
    CartItem,
    Cart
};