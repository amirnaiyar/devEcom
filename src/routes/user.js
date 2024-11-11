const express = require("express")
const userRouter = express.Router()
const { userAuth } = require("../middleware/auth")
const User = require("../models/user")

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


module.exports = userRouter