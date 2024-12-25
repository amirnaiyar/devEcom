const mongoose = require("mongoose");
const { generateSlug } = require("../utils/utils");
require("./product"); // Ensure the Product schema is loaded

const subcategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true },
    description: { type: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" }, // Optional: Link back to the parent category if needed
    product: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to generate slug
subcategorySchema.pre("save", function (next) {
  if (!this.slug) {
    this.slug = generateSlug(this.name);
  }
  next();
});

// Optional: Pre-update middleware to regenerate slug if the name is updated
subcategorySchema.pre("findOneAndUpdate", function (next) {
  if (this.getUpdate().name) {
    this.getUpdate().slug = generateSlug(this.getUpdate().name);
  }
  next();
});

const Subcategory = mongoose.model("Subcategory", subcategorySchema);

module.exports = Subcategory;
