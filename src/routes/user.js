const express = require("express")
const userRouter = express.Router()
const { userAuth } = require("../middleware/auth")
const User = require("../models/user")
const Product = require('../models/product');

userRouter.get("/profile", userAuth, (req, res) => {
    try {
        const user = req.user
        res.json({
            data: user
        })
    } catch (error) {
        res.status(400).send("ERROR: " + error.message)
    }
})

userRouter.post("/profile/update" , userAuth, async(req, res) => {
    try {
        const loggedinUser = req.user
        const { name, phone, addresses } = req.body;
        const ALLOWED_UPDATE = [ "name", "phone", "addresses" ]
        const isAllowedUpdate =  Object.keys(req.body).every(field => ALLOWED_UPDATE.includes(field))
        if(isAllowedUpdate){
            const updateUser = await User.findByIdAndUpdate(loggedinUser._id, 
                { name, phone, addresses }, {new: true})
            res.json({
                status: "success",
                message: "User updated successful",
                data: updateUser
            })
        } else {
            throw new Error("Update not allowed on some field!")
        }
    } catch (error) {
        res.status(400).send("ERROR: " + error.message)
    }
})

// Add Shipping Address API

// Add Shipping Address API
userRouter.post("/add-shipping-address", userAuth, async (req, res) => {
    const { fullName, phone, street, city, state, postalCode, country } = req.body;

    // Validate required fields
    if (!fullName || !phone || !street || !city || !state || !postalCode || !country) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Create new address object
        const newAddress = { fullName, phone, street, city, state, postalCode, country };

        // Add the new address to user's addresses array
        user.addresses.push(newAddress);

        // Set defaultAddressId if it's the only address
        if (user.addresses.length === 1) {
            user.defaultAddressId = user.addresses[0]._id;
        }

        // Save the user document with the new address and default setting
        await user.save();

        res.status(201).json({ message: "Address added successfully", address: newAddress, defaultAddressId: user.defaultAddressId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Set Default Address API
userRouter.post("/set-default-address", userAuth, async (req, res) => {
    const { addressId } = req.body;
    console.log(addressId, 'addressId');
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Check if the address exists in the user's addresses array
        const addressExists = user.addresses.some(address => address._id.toString() === addressId);
        if (!addressExists) return res.status(400).json({ message: "Address not found" });

        // Set the default address ID
        await user.setDefaultAddress(addressId);

        // // Save the changes
        // await user.save();

        res.status(200).json({ message: "Default address updated successfully", defaultAddressId: user.defaultAddressId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// Add to Wishlist API
// userRouter.post("/wishlist/add/:productId", userAuth, async (req, res) => {
//     const { productId } = req.params;

//     try {
//         // Check if the product exists
//         const product = await Product.findById(productId);
//         if (!product) {
//             return res.status(404).json({ message: "Product not found" });
//         }

//         // Find the user
//         const user = await User.findById(req.user._id);
//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         // Check if the product is already in the wishlist
//         const isInWishlist = user.wishlist.some(
//             (item) => item.toString() === productId
//         );
//         if (isInWishlist) {
//             return res.status(400).json({ message: "Product already in wishlist" });
//         }

//         // Add the product to the wishlist
//         user.wishlist.push(productId);
//         await user.save();

//         res.status(200).json({ message: "Product added to wishlist", wishlist: user.wishlist, user });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Internal server error", error });
//     }
// });

userRouter.post("/wishlist/:productId", userAuth, async (req, res) => {
    const { productId } = req.params;
    const { action } = req.body; // Action can be 'add' or 'remove'
    console.log(productId, action, 'data')
    try {
        // Check if the product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Find the user
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (action === "add") {
            // Check if the product is already in the wishlist
            const isInWishlist = user.wishlist.some(
                (item) => item.toString() === productId
            );
            if (isInWishlist) {
                return res.status(400).json({ message: "Product already in wishlist" });
            }

            // Add the product to the wishlist
            user.wishlist.push(productId);
            await user.save();

            return res.status(200).json({ message: "Product added to wishlist", wishlist: user.wishlist });

        } else if (action === "remove") {
            // Check if the product is in the wishlist
            const isInWishlist = user.wishlist.some(
                (item) => item.toString() === productId
            );
            if (!isInWishlist) {
                return res.status(400).json({ message: "Product not found in wishlist" });
            }

            // Remove the product from the wishlist
            user.wishlist = user.wishlist.filter(
                (item) => item.toString() !== productId
            );
            await user.save();

            return res.status(200).json({ message: "Product removed from wishlist", wishlist: user.wishlist });
        } else {
            return res.status(400).json({ message: "Invalid action. Use 'add' or 'remove'." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error", error });
    }
});

// Get all wishlisted products
userRouter.get("/wishlist", userAuth, async (req, res) => {
    try {
        // Fetch the user with their wishlist
        const user = await User.findById(req.user._id).select("wishlist");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Populate the products in the wishlist
        const wishlistedProducts = await Product.find({ _id: { $in: user.wishlist }, isActive: true })
            .populate("category subcategory") // Populate category and subcategory references
            .populate("sizes.size") // Populate size references if needed
            .populate("colors.color"); // Populate color references if needed

            // Add the isWishlisted flag to each product
        const updatedWishlistedProducts = wishlistedProducts.map((product) => ({
            ...product.toObject(), // Convert Mongoose document to plain object
            isWishlisted: true,
        }));
        res.status(200).json({ data: updatedWishlistedProducts });
    } catch (error) {
        console.error("Error fetching wishlisted products:", error);
        res.status(500).json({ message: "Error fetching wishlisted products", error });
    }
});


module.exports = userRouter