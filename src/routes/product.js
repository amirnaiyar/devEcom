const express = require('express');
const Product = require('../models/product');
const User = require("../models/user")
const Review = require('../models/review');
const productRouter = express.Router();
const { userAuth } = require('../middleware/auth');

const hasUserRatedProduct = async (userId, productId) => {
    try {
        // Check for an existing review by the user for the specific product
        const review = await Review.findOne({ user: userId, product: productId });

        if (review) {
            // User has rated the product
            return {
                hasRated: true,
                rating: review.rating,
                comment: review.comment,
            };
        } else {
            // User has not rated the product
            return {
                hasRated: false,
                rating: null,
                comment: null,
            };
        }
    } catch (error) {
        console.error('Error checking if user has rated product:', error);
        throw error;
    }
};

// Create a new product
productRouter.post('/', async (req, res) => {
    try {
        const { name, description, price, sellingPrice, stock, category, subcategory, brand, images,  sizes, colors } = req.body;
        const product = new Product({ name, description, price, sellingPrice, stock, category, subcategory, brand, images, sizes, colors });
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ message: 'Error creating product', error });
    }
});

productRouter.post('/batch', async (req, res) => {
    try {
        const products = req.body.products; // Expecting an array of products
        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ message: 'Invalid input: please provide an array of products.' });
        }

        // Map through the products array to create and save each product
        const savedProducts = await Promise.all(products.map(async (productData) => {
            const { name, description, price, sellingPrice, stock, category, subcategory, brand, images, hasSize, sizes, hasColor, colors } = productData;
            const product = new Product({ name, description, price, sellingPrice, stock, category, subcategory, brand, images, hasSize, sizes, hasColor, colors });
            return await product.save();
        }));

        res.status(201).json(savedProducts);
    } catch (error) {
        res.status(400).json({ message: 'Error creating products', error });
    }
});



productRouter.get('/new', userAuth, async (req, res) => {
    try {
        // Get the limit from the query parameters or set a default limit
        const limit = parseInt(req.query.limit) || 10;

        // Fetch products sorted by creation date in descending order
        const products = await Product.find({ isActive: true }) // Only active products
            .sort({ createdAt: -1 }) // Sort by newest first
            .limit(limit) // Limit the number of products
            .populate('category subcategory') // Populate category and subcategory references
            .populate('sizes.size') // Populate size references if needed
            .populate('colors.color'); // Populate color references if needed
        let userWishlist = [];

        // If the user is authenticated, get their wishlist
        if (req.user) {
            const user = await User.findById(req.user._id).select('wishlist');
            if (user) {
                userWishlist = user.wishlist.map((item) => item.toString());
            }
        }

        // Add the isWishlisted flag to each product
        const updatedProducts = products.map((product) => ({
            ...product.toObject(), // Convert Mongoose document to plain object
            isWishlisted: userWishlist.includes(product._id.toString()),
        }));

        res.status(200).json(updatedProducts);
    } catch (error) {
        console.error("Error fetching new products:", error);
        res.status(500).json({ message: "Error fetching new products", error });
    }
});


productRouter.get('/sale', userAuth, async (req, res) => {
    try {
        // Get the limit from the query parameters or set a default limit
        const limit = parseInt(req.query.limit) || 10;

        // Fetch sale products (where sellingPrice is less than the original price)
        const saleProducts = await Product.find({
                isActive: true, // Only active products
                $expr: { $lt: ["$sellingPrice", "$price"] } // Compare sellingPrice and price
            })
            .sort({ createdAt: -1 }) // Sort by newest first
            .limit(limit) // Limit the number of sale products
            .populate('category subcategory') // Populate category and subcategory references
            .populate('sizes.size') // Populate size references if needed
            .populate('colors.color'); // Populate color references if needed
        let userWishlist = [];

        // If the user is authenticated, get their wishlist
        if (req.user) {
            const user = await User.findById(req.user._id).select('wishlist');
            if (user) {
                userWishlist = user.wishlist.map((item) => item.toString());
            }
        }

        // Add the isWishlisted flag to each product
        const updatedProducts = saleProducts.map((product) => ({
            ...product.toObject(), // Convert Mongoose document to plain object
            isWishlisted: userWishlist.includes(product._id.toString()),
        }));

        res.status(200).json(updatedProducts);
    } catch (error) {
        console.error("Error fetching sale products:", error);
        res.status(500).json({ message: "Error fetching sale products", error });
    }
});

productRouter.get('/:id', userAuth, async (req, res) => {
    try {
        const productId = req.params.id;
        const userId = req.user ? req.user._id : null;

        // Fetch the product details with colors and sizes populated
        const product = await Product.findById(productId)
            .populate({
                path: 'colors.color', // Populate the color field in colors array
                model: 'Color',
                select: 'name displayName hexCode', // Select fields to include
            })
            .populate({
                path: 'sizes.size', // Populate the size field in sizes array
                model: 'Size',
                select: 'name displayName displayOrder', // Select fields to include
            });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (!product.isActive) {
            return res.status(400).json({ message: 'No Product Found!' });
        }

        if (!product.stock || product.stock === 0) {
            return res.status(400).json({ message: 'No stock available for this product!' });
        }

        // Check if the user has rated the product
        let userRatingStatus = {
            hasRated: false,
            rating: null,
            comment: null,
        };

        if (userId) {
            const review = await Review.findOne({ user: userId, product: productId });
            if (review) {
                userRatingStatus = {
                    hasRated: true,
                    rating: review.rating,
                    comment: review.comment,
                };
            }
        }

        // Check if the user has wishlisted the product
        let isWishlisted = false;
        if (userId) {
            const user = await User.findById(userId).select('wishlist');
            if (user) {
                isWishlisted = user.wishlist.some((item) => item.toString() === productId);
            }
        }

        // Add the additional data to the product object
        const productWithAdditionalInfo = {
            ...product.toObject(), // Convert Mongoose document to plain object
            isWishlisted,
            userRatingStatus, // Include the user's rating status
        };

        res.status(200).json({ data: productWithAdditionalInfo });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ message: 'Error fetching product', error });
    }
});


productRouter.put("/:productId", userAuth, async (req, res) => {
    const productId = req.params.productId;
    const updates = req.body; // Fields to update

    try {
        // Validate the product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Validate specific fields if needed
        if (updates.price && updates.sellingPrice && updates.sellingPrice > updates.price) {
            return res.status(400).json({ message: "Selling price cannot be greater than the original price" });
        }

        // Update the product
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { $set: updates },
            { new: true, runValidators: true } // Return the updated document and run validators
        ).populate("category", "name").populate("subcategory", "name");

        res.status(200).json({
            message: "Product updated successfully",
            product: updatedProduct,
        });
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({
            message: "Error updating the product",
            error,
        });
    }
});

productRouter.get('/:productId/similar',userAuth, async (req, res) => {
    const { productId } = req.params;

    try {
        // Fetch the base product to find its attributes (e.g., categories, brand, etc.)
        const product = await Product.findById(productId)
            .select('categories subcategories brand')
            .lean();

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Build the query for similar products
        const query = {
            _id: { $ne: productId }, // Exclude the current product
            isActive: true, // Ensure only active products are fetched
            $or: [
                { categories: { $in: Array.isArray(product.categories) ? product.categories : [product.categories] } },
                { subcategories: { $in:  Array.isArray(product.subcategories) ? product.subcategories : [product.subcategories]  } },
                { brand: product.brand }
            ]
        };

        // Fetch similar products
        const similarProducts = await Product.find(query)
            .populate("category", "name")
            .populate("sizes.size", "size")
            .populate("colors.color", "name")
            .populate("reviews", "rating")
            .limit(10)

        
        let userWishlist = [];
        if (req.user) {
            const user = await User.findById(req.user._id).select("wishlist");
            if (user) {
                userWishlist = user.wishlist.map((item) => item.toString());
            }
        }
        // Add the isWishlisted flag and calculated fields to each product
        const updatedSimilarProducts = similarProducts.map((product) => ({
            ...product?.toObject(),
            isWishlisted: userWishlist.includes(product._id.toString()),
            hasDiscount: product.sellingPrice < product.price
        }));

        res.status(200).json({ success: true, similarProducts: updatedSimilarProducts });
    } catch (error) {
        console.error('Error fetching similar products:', error);
        res.status(500).json({ success: false, message: 'Error fetching similar products', error });
    }
});

productRouter.post('/rate', userAuth, async (req, res) => {
    try {
        const { productId, rating, comment } = req.body;
        const userId = req.user._id;

        // Validate input
        if (!productId || !rating) {
            return res.status(400).json({ message: 'Product ID and rating are required.' });
        }
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5.' });
        }

        // Check if the product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        // Check if the user has already reviewed the product
        const existingReview = await Review.findOne({ user: userId, product: productId });
        if (existingReview) {
            // Update the existing review
            existingReview.rating = rating;
            existingReview.comment = comment || existingReview.comment;
            await existingReview.save();
        } else {
            // Create a new review
            const review = new Review({
                user: userId,
                product: productId,
                rating,
                comment,
            });
            await review.save();

            // Add the review to the product
            product.reviews.push(review._id);
        }

        // Recalculate the average rating
        const allReviews = await Review.find({ product: productId });
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

        // Update the product's average rating
        product.rating = avgRating;
        await product.save();

        // Retrieve the updated product details with populated data
        const updatedProduct = await Product.findById(productId)
            .populate({
                path: 'colors.color',
                model: 'Color',
                select: 'name displayName hexCode',
            })
            .populate({
                path: 'sizes.size',
                model: 'Size',
                select: 'name displayName displayOrder',
            });

        // Check if the user has wishlisted the product
        let isWishlisted = false;
        const user = await User.findById(userId).select('wishlist');
        if (user) {
            isWishlisted = user.wishlist.some((item) => item.toString() === productId);
        }

        // Check if the user has rated the product
        let userRatingStatus = {
            hasRated: false,
            rating: null,
            comment: null,
        };

        const userReview = await Review.findOne({ user: userId, product: productId });
        if (userReview) {
            userRatingStatus = {
                hasRated: true,
                rating: userReview.rating,
                comment: userReview.comment,
            };
        }

        // Combine product data with additional info
        const productWithAdditionalInfo = {
            ...updatedProduct.toObject(),
            isWishlisted,
            userRatingStatus,
        };

        res.status(200).json({ message: 'Rating submitted successfully.', product: productWithAdditionalInfo });
    } catch (error) {
        console.error('Error rating product:', error);
        res.status(500).json({ message: 'Failed to rate product.', error });
    }
});


module.exports = productRouter