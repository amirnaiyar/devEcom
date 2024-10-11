const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")

// Address sub-schema (for reusability in multiple places)
const addressSchema = new mongoose.Schema({
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
}, { _id: false }); // No _id field for embedded sub-documents


const userSchema = new mongoose.Schema({
    name: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true }
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true,
        match: [/.+\@.+\..+/, 'Please enter a valid email address']
    },
    password: { type: String, required: true, minlength: 6 },
    refreshToken: { type: String },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    addresses: [addressSchema], // Array of addresses (billing, shipping, etc.)
    phone: { type: String, required: true },
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], // Array of product references
    cart: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, default: 1 }
    }],
    orderHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }], // Array of past orders
    isVerified: { type: Boolean, default: false }, // Email verification status
    resetPasswordToken: { type: String }, // For password recovery
    resetPasswordExpires: { type: Date },
},
    {
        timestamps: true
    },
)

userSchema.methods.generateAccessToken = function () { 
    return jwt.sign( { _id: this._id,
    //  username: this.username 
    },
    process.env.ACCESS_TOKEN_SECRET_KEY, { expiresIn: "1d" } // Token valid for 1 day ); 
    )};
    userSchema.methods.generateRefreshToken = function () {
      return jwt.sign(
        { _id: this._id, 
            // username: this.username 
        },
        process.env.REFRESH_TOKEN_SECRET_KEY,
        { expiresIn: "7d" } // Token valid for 7 days
      );
    };


const User = mongoose.model('User', userSchema)

module.exports = User