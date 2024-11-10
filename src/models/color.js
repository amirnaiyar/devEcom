const mongoose = require("mongoose")

const colorSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // e.g., 'red', 'skyblue', 'light-yellow'
    displayName: { type: String, required: true }, // e.g., 'Red', 'Sky Blue', 'Light Yellow'
    hexCode: { type: String, required: true }, // e.g., '#FF0000', '#87CEEB', '#FFFFE0'
});

const Color = mongoose.model('Color', colorSchema);

module.exports = Color;