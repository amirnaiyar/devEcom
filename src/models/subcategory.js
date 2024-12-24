const mongoose = require("mongoose");
require("./product"); // Ensure the Product schema is loaded

const subcategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" }, // Optional: Link back to the parent category if needed
    product: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  {
    timestamps: true,
  }
);

const Subcategory = mongoose.model("Subcategory", subcategorySchema);

module.exports = Subcategory;
