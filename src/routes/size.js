const express = require("express");
const Size = require("../models/size");
const { adminAuth } = require("../middleware/auth");
const sizeRouter = express.Router();

// Create a new size
sizeRouter.post("/", adminAuth, async (req, res) => {
  try {
    const { name, displayName, type, displayOrder } = req.body;
    const size = new Size({ name, displayName, type, displayOrder });
    await size.save();
    res.status(201).json(size);
  } catch (error) {
    res.status(400).json({ message: "Error creating size", error });
  }
});

// get all sizes
sizeRouter.get("/", async (req, res) => {
  try {
    const sizes = await Size.find();
    res.status(201).json({
      status: "success",
      data: sizes,
    });
  } catch (error) {
    res.status(400).json({ message: "Error fetching size", error });
  }
});

sizeRouter.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const size = await Size.findById(id);
    if (size) {
      res.status(201).json(size);
    } else {
      res.status(404).json({ message: "Size not found" });
    }
  } catch (error) {
    res.status(400).json({ message: "Error fetching Size", error });
  }
});

module.exports = sizeRouter;
