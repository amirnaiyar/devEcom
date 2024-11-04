const mongoose  = require("mongoose");

const subcategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" }, // Optional: Link back to the parent category if needed
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Products" }],
  }, {
    timestamps: true,
  });
  
  const Subcategory = mongoose.model("Subcategory", subcategorySchema);
  
  module.exports = Subcategory;
  