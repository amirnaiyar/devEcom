const express = require("express");
const Color = require("../models/color");
const { adminAuth } = require("../middleware/auth");
const colorRouter = express.Router();

// Create a new product
colorRouter.post("/", adminAuth, async (req, res) => {
  try {
    const { name, displayName, hexCode } = req.body;
    const color = new Color({ name, displayName, hexCode });
    await color.save();
    res.status(201).json(color);
  } catch (error) {
    res.status(400).json({ message: "Error creating color", error });
  }
});

// get all sizes
colorRouter.get("/", async (req, res) => {
  try {
    const colors = await Color.find();
    res.status(201).json({
      status: "success",
      data: colors,
    });
  } catch (error) {
    res.status(400).json({ message: "Error fetching color", error });
  }
});

colorRouter.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const color = await Color.findById(id);
    if (color) {
      res.status(201).json(color);
    } else {
      res.status(404).json({ message: "Color not found" });
    }
  } catch (error) {
    res.status(400).json({ message: "Error fetching Color", error });
  }
});

module.exports = colorRouter;
