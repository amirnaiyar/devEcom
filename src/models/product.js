const mongoose = require("mongoose")


const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 }, // Inventory count
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    brand: { type: String },
    images: [{ type: String }],  // URLs of product images
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
    rating: { type: Number, default: 0 },  // Average rating
}, {
    timestamps: true,
  });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;