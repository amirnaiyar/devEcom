const mongoose = require("mongoose")


const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    sellingPrice: { type: Number }, // Discounted or promotional price
    stock: { type: Number, default: 0 }, // Inventory count
    category: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true }], // Array of categories
    subcategory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subcategory", required: true }], // Array of subcategories
    brand: { type: String },
    images: [
      {
        url: { type: String, required: true }, // URL of the image
        type: { type: String, enum: ["thumbnail", "main_image", "gallery"], required: true } // Image type
      }
    ],
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
    rating: { type: Number, default: 0 },  // Average rating
}, {
    timestamps: true,
  });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;