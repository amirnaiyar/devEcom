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
    hasSize: { type: Boolean, default: false },
    sizes: [
      {
        size: { type: mongoose.Schema.Types.ObjectId, ref: 'Size', required: true },
        stock: { type: Number, default: 0 } 
      }
    ],
    hasColor: { type: Boolean, default: false },
    colors: [
      {
        color: { type: mongoose.Schema.Types.ObjectId, ref: 'Color', required: true },
        stock: { type: Number, default: 0 } 
      }
    ],
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }],
    rating: { type: Number, default: 0 },  // Average rating
    isActive: { type: Boolean, default: true },
}, {
    timestamps: true,
  });

  // Middleware to update the `stock` field based on sizes/colors
productSchema.pre('save', function(next) {
  let totalStock = 0;

  // Calculate total stock from sizes, if applicable
  if (this.hasSize && this.sizes.length > 0) {
      totalStock = this.sizes.reduce((acc, size) => acc + size.stock, 0);
  }

  // Calculate total stock from colors if applicable and no sizes are defined
  if (this.hasColor && this.colors.length > 0 && totalStock === 0) {
      totalStock = this.colors.reduce((acc, color) => acc + color.stock, 0);
  }

  // Fallback to the main stock if neither sizes nor colors are defined
  this.stock = totalStock || this.stock;
  
  next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;