const mongoose = require("mongoose")

const sizeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // e.g., "S", "M", "L", "10x20"
    displayName: { type: String, required: true }, // e.g., "Small", "Medium", "Large", "10x20 cm"
    type: { type: String, required: true }, // e.g., "clothing", "shoes", "dimensions"
    displayOrder: { type: Number } // For consistent sorting in UI
});

const Size = mongoose.model('Size', sizeSchema);


module.exports = Size;