
const mongoose = require("mongoose")

const CartItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    color: { type: mongoose.Schema.Types.ObjectId, ref: 'Color' }, // Added color reference
    size: { type: mongoose.Schema.Types.ObjectId, ref: 'Size' } 
  });
  
  const CartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [CartItemSchema],
    appliedCoupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' }, // Reference to the Coupon model
    totalAmount: { type: Number, required: true }, // Original total amount
    discountAmount: { type: Number, default: 0 }, // Calculated discount amount based on coupon
    finalAmount: { type: Number, required: true } // Total after applying the discount
}, { timestamps: true });



  // Helper function to calculate total price
  CartSchema.methods.calculateTotalPrice = async function () {
    const cart = this;
    let totalAmount = 0;

     // If there are no items, delete the cart and exit the function
     if (cart.items.length === 0) {
      await Cart.deleteOne({ _id: cart._id }); // Delete cart by ID
      return null;
  }

    // Populate the product, color, and size details in items
    await cart.populate('items.product items.color items.size');

    // Calculate the original total amount based on quantity and product price
    cart.items.forEach(item => {
        const itemPrice = item.product.sellingPrice || item.product.price; // Use sellingPrice if available
        totalAmount += itemPrice * item.quantity;
    });

    cart.totalAmount = totalAmount;

    // Check if there is an applied coupon
    if (cart.appliedCoupon) {
        const coupon = await Coupon.findById(cart.appliedCoupon);

        // Validate coupon and calculate discount
        if (coupon && coupon.isActive && (!coupon.expirationDate || coupon.expirationDate > new Date())) {
            const discountAmount = coupon.discountType === 'percentage'
                ? cart.totalAmount * (coupon.discountValue / 100)
                : coupon.discountValue;

            cart.discountAmount = Math.min(discountAmount, cart.totalAmount); // Ensure discount does not exceed total
        } else {
            // Remove invalid or expired coupon
            cart.appliedCoupon = null;
            cart.discountAmount = 0;
        }
    } else {
        cart.discountAmount = 0;
    }

    // Calculate final amount after applying discount
    cart.finalAmount = cart.totalAmount - cart.discountAmount;

    // Save the cart
    await cart.save();
    return cart;
};

  
  
  
  // Method to calculate discount
  CartSchema.methods.applyCoupon = async function (couponCode) {
    // Fetch the coupon by code and check if it's active and not expired
    const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
    if (!coupon || (coupon.expirationDate && coupon.expirationDate < new Date())) {
        throw new Error('Invalid or expired coupon');
    }
  
    // Ensure totalAmount has a valid number
    const totalAmount = this.totalAmount || 0; // Default to 0 if totalAmount is undefined
    
    // Calculate the discount amount
    const discountAmount = coupon.discountType === 'percentage'
        ? totalAmount * (coupon.discountValue / 100)
        : coupon.discountValue;
  
    // Ensure discount does not exceed totalAmount and avoid NaN issues
    this.discountAmount = Math.min(discountAmount || 0, totalAmount); // Default to 0 if discountAmount is invalid
    this.finalAmount = totalAmount - this.discountAmount;
    this.appliedCoupon = coupon._id;
  
    return this.save();
  };
  



  const CartItem = mongoose.model('CartItem', CartItemSchema);
  const Cart = mongoose.model('Cart', CartSchema);

module.exports = {
    CartItem,
    Cart
};