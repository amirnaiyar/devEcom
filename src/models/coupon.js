const mongoose = require('mongoose')

const CouponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    discountPercentage: { type: Number, required: true },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
  }, {
    timestamps: true,
  });



  const Coupon = mongoose.model('Coupon', CouponSchema);

  module.exports = Coupon;