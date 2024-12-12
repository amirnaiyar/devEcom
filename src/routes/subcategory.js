const express = require("express");
const Subcategory = require("../models/subcategory");
const Category = require("../models/category");
const Product = require("../models/product");
const Review = require("../models/review");
const User = require("../models/user");
const { userAuth } = require("../middleware/auth");
const { default: mongoose } = require("mongoose");
const subcategoryRouter = express.Router();

// Create a new category
subcategoryRouter.post("/", async (req, res) => {
  const { name, slug, description, categoryId } = req.body;

  try {
    // Check if the category exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Create a new subcategory
    const subcategory = new Subcategory({
      name,
      slug,
      description,
      category: categoryId,
    });

    await subcategory.save();

    // Add subcategory to the category's subcategories array
    category.subcategories.push(subcategory._id);
    await category.save();

    res.status(201).json({
      message: "Subcategory created successfully",
      subcategory,
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating subcategory", error });
  }
});

// Get all products by subcategory
subcategoryRouter.get(
  "/:subcategoryId/products",
  userAuth,
  async (req, res) => {
    const subcategoryId = req.params.subcategoryId;
    const sortOption = req.query.sort; // Get sorting option from query parameters

    try {
      // Fetch the subcategory and populate the main category (optional)
      const subcategory = await Subcategory.findById(subcategoryId).populate(
        "category",
        "name"
      );
      if (!subcategory) {
        return res.status(404).json({ message: "Subcategory not found" });
      }

      // Define sorting logic
      let sortCriteria = {};
      switch (sortOption) {
        case "popular":
          sortCriteria = { rating: -1 }; // Sort by average rating (highest first)
          break;
        case "newest":
          sortCriteria = { createdAt: -1 }; // Sort by creation date (newest first)
          break;
        case "customer_review":
          sortCriteria = { reviews: -1 }; // Assuming 'reviews' contains the count of reviews
          break;
        case "price_low_to_high":
          sortCriteria = { sellingPrice: 1 }; // Sort by selling price (lowest first)
          break;
        case "price_high_to_low":
          sortCriteria = { sellingPrice: -1 }; // Sort by selling price (highest first)
          break;
        default:
          sortCriteria = {}; // Default sort (no sorting)
          break;
      }

      // Fetch all products associated with this subcategory
      const products = await Product.find({
        subcategory: subcategoryId,
        isActive: true,
      })
        .populate("category", "name")
        .populate("sizes.size", "size")
        .populate("colors.color", "name")
        .lean(); // Use lean() to return plain JavaScript objects for modification

      // If the user is authenticated, get their wishlist
      let userWishlist = [];
      if (req.user) {
        const user = await User.findById(req.user._id).select("wishlist");
        if (user) {
          userWishlist = user.wishlist.map((item) => item.toString());
        }
      }

      // Add review data (`average_rating`, `review_count`) to each product
      const updatedProducts = await Promise.all(
        products.map(async (product) => {
          const reviews = await Review.find({ product: product._id }).select(
            "rating"
          );
          const reviewCount = reviews.length;
          const averageRating =
            reviewCount > 0
              ? reviews.reduce((sum, review) => sum + review.rating, 0) /
                reviewCount
              : 0;

          return {
            ...product,
            review_count: reviewCount,
            average_rating: parseFloat(averageRating.toFixed(1)), // Round to 1 decimal place
            isWishlisted: userWishlist.includes(product._id.toString()),
            hasDiscount: product.sellingPrice < product.price,
          };
        })
      );

      res.status(200).json({
        name: subcategory.name,
        products: updatedProducts,
      });
    } catch (error) {
      console.error("Error fetching products for the subcategory:", error);
      res
        .status(500)
        .json({
          message: "Error fetching products for the subcategory",
          error,
        });
    }
  }
);

const getFacetsData = async (subcategoryId) => {
  const subcategoryObjectId = new mongoose.Types.ObjectId(subcategoryId);

  return await Product.aggregate([
    { $match: { subcategory: subcategoryObjectId, isActive: true } },
    {
      $facet: {
        colors: [
          { $unwind: { path: "$colors" } },
          {
            $lookup: {
              from: "colors", // Replace with your actual collection name
              localField: "colors.color",
              foreignField: "_id",
              as: "colorDetails",
            },
          },
          { $unwind: { path: "$colorDetails" } },
          {
            $group: {
              _id: "$colorDetails._id",
              name: { $first: "$colorDetails.name" },
              hexCode: { $first: "$colorDetails.hexCode" },
              count: { $sum: 1 },
            },
          },
        ],
        sizes: [
          { $unwind: { path: "$sizes" } },
          {
            $lookup: {
              from: "sizes",
              localField: "sizes.size",
              foreignField: "_id",
              as: "sizeDetails",
            },
          },
          { $unwind: { path: "$sizeDetails" } },
          {
            $group: {
              _id: "$sizeDetails._id",
              displayName: { $first: "$sizeDetails.displayName" },
              count: { $sum: 1 },
            },
          },
        ],
        brands: [
          {
            $group: {
              _id: "$brand",
              name: { $first: "$brand" },
              count: { $sum: 1 },
            },
          },
        ],
        priceRange: [
          {
            $group: {
              _id: null,
              minPrice: { $min: "$sellingPrice" },
              maxPrice: { $max: "$sellingPrice" },
            },
          },
        ],
      },
    },
  ]);
};

subcategoryRouter.get(
  "/:subcategoryId/products/facets",
  userAuth,
  async (req, res) => {
    try {
      const subcategoryId = req.params.subcategoryId;

      if (!mongoose.Types.ObjectId.isValid(subcategoryId)) {
        return res.status(400).json({ message: "Invalid subcategoryId" });
      }

      const subcategoryObjectId = new mongoose.Types.ObjectId(subcategoryId); // Convert to ObjectId

      const facets = await Product.aggregate([
        { $match: { subcategory: subcategoryObjectId, isActive: true } },
        {
          $facet: {
            colors: [
              { $unwind: { path: "$colors" } },
              {
                $lookup: {
                  from: "colors", // Replace with your actual collection name for colors
                  localField: "colors.color",
                  foreignField: "_id",
                  as: "colorDetails",
                },
              },
              { $unwind: { path: "$colorDetails" } },
              {
                $group: {
                  _id: "$colorDetails._id",
                  name: { $first: "$colorDetails.name" },
                  hexCode: { $first: "$colorDetails.hexCode" },
                  count: { $sum: 1 },
                },
              },
            ],
            sizes: [
              { $unwind: { path: "$sizes" } },
              {
                $lookup: {
                  from: "sizes", // Replace with your actual collection name for sizes
                  localField: "sizes.size",
                  foreignField: "_id",
                  as: "sizeDetails",
                },
              },
              { $unwind: { path: "$sizeDetails" } },
              {
                $group: {
                  _id: "$sizeDetails._id",
                  displayName: { $first: "$sizeDetails.displayName" },
                  count: { $sum: 1 },
                },
              },
            ],
            brands: [
              {
                $group: {
                  _id: "$brand",
                  name: { $first: "$brand" },
                  count: { $sum: 1 },
                },
              },
            ],
            priceRange: [
              {
                $group: {
                  _id: null,
                  minPrice: { $min: "$sellingPrice" },
                  maxPrice: { $max: "$sellingPrice" },
                },
              },
            ],
          },
        },
      ]);

      res.status(200).json(facets[0]);
    } catch (error) {
      console.error("Error fetching facets:", error);
      res.status(500).json({ message: "Error fetching facets", error });
    }
  }
);

subcategoryRouter.get("/:subcategoryId/filters", userAuth, async (req, res) => {
  try {
    const subcategoryId = req.params.subcategoryId;
    const { minPrice, maxPrice, brands, colorIds, sizeIds, search } = req.query;

    if (!subcategoryId) {
      return res.status(400).json({
        success: false,
        message: "Subcategory ID is required.",
      });
    }

    // Initialize query with the mandatory subcategory filter
    const query = { isActive: true, subcategory: subcategoryId };

    // Track applied filters
    const appliedFilters = {};

    // Apply search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } }, // Case-insensitive name match
        { description: { $regex: search, $options: "i" } }, // Case-insensitive description match
      ];
      appliedFilters.search = search;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) {
        query.price.$gte = Number(minPrice);
        appliedFilters.minPrice = Number(minPrice);
      }
      if (maxPrice) {
        query.price.$lte = Number(maxPrice);
        appliedFilters.maxPrice = Number(maxPrice);
      }
    }

    if (brands) {
      query.brand = { $in: brands.split(",") };
      appliedFilters.brands = brands.split(",");
    }

    if (colorIds) {
      query["colors.color"] = { $in: colorIds.split(",") };
      appliedFilters.colorIds = colorIds.split(",");
    }

    if (sizeIds) {
      query["sizes.size"] = { $in: sizeIds.split(",") };
      appliedFilters.sizeIds = sizeIds.split(",");
    }

    // Fetch filtered products
    const products = await Product.find(query)
      .populate("sizes.size", "name")
      .populate("colors.color", "name")
      .select("name price brand colors sizes images description")
      .lean(); // Use lean() to make objects lightweight

    // Add review data (average rating and review count) for each product
    const updatedProducts = await Promise.all(
      products.map(async (product) => {
        const reviews = await Review.find({ product: product._id }).select(
          "rating"
        );
        const reviewCount = reviews.length;
        const averageRating =
          reviewCount > 0
            ? reviews.reduce((sum, review) => sum + review.rating, 0) /
              reviewCount
            : 0;

        return {
          ...product,
          review_count: reviewCount,
          average_rating: parseFloat(averageRating.toFixed(1)), // Round to 1 decimal place
        };
      })
    );

    // Fetch facets (unchanged logic)
    const facetData = await Product.aggregate([
      { $match: { subcategory: subcategoryId, isActive: true } },
      {
        $facet: {
          colors: [
            { $unwind: "$colors" },
            { $group: { _id: "$colors.color", count: { $sum: 1 } } },
            {
              $lookup: {
                from: "colors",
                localField: "_id",
                foreignField: "_id",
                as: "colorDetails",
              },
            },
            { $unwind: "$colorDetails" },
            {
              $project: {
                _id: 1,
                count: 1,
                name: "$colorDetails.name",
                hexcode: "$colorDetails.hexcode",
              },
            },
          ],
          sizes: [
            { $unwind: "$sizes" },
            { $group: { _id: "$sizes.size", count: { $sum: 1 } } },
            {
              $lookup: {
                from: "sizes",
                localField: "_id",
                foreignField: "_id",
                as: "sizeDetails",
              },
            },
            { $unwind: "$sizeDetails" },
            {
              $project: {
                _id: 1,
                count: 1,
                name: "$sizeDetails.name",
              },
            },
          ],
          brands: [{ $group: { _id: "$brand", count: { $sum: 1 } } }],
          priceRange: [
            {
              $group: {
                _id: null,
                minPrice: { $min: "$price" },
                maxPrice: { $max: "$price" },
              },
            },
          ],
        },
      },
    ]);

    // Add `isApplied` key to facet data
    const facets = facetData[0];
    facets.colors = facets.colors.map((color) => ({
      ...color,
      isApplied:
        appliedFilters.colorIds?.includes(color._id.toString()) || false,
    }));
    facets.sizes = facets.sizes.map((size) => ({
      ...size,
      isApplied: appliedFilters.sizeIds?.includes(size._id.toString()) || false,
    }));
    facets.brands = facets.brands.map((brand) => ({
      ...brand,
      isApplied: appliedFilters.brands?.includes(brand._id) || false,
    }));
    facets.priceRange = {
      ...facets.priceRange[0],
      isApplied: !!(minPrice || maxPrice),
    };

    res.status(200).json({
      success: true,
      appliedFilters,
      facets,
      products: updatedProducts,
    });
  } catch (error) {
    console.error("Error fetching filters:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching filters",
      error,
    });
  }
});

module.exports = subcategoryRouter;
