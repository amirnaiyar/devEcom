const mongoose = require('mongoose')

const CouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true }, // Unique coupon code
  discountType: { type: String, enum: ['percentage', 'flat'], required: true }, // Percentage or flat discount
  discountValue: { type: Number, required: true }, // Discount amount (percentage or flat amount)
  minimumOrderValue: { type: Number, default: 0 }, // Minimum order amount for coupon to be applicable
  expirationDate: { type: Date }, // Expiry date of the coupon
  isActive: { type: Boolean, default: true } // To manage active/inactive state of coupon
}, { timestamps: true });



const Coupon = mongoose.model('Coupon', CouponSchema);

module.exports = Coupon;