const mongoose = require("mongoose")
const validator = require("validator")
const bcrypt = require("bcrypt")
const crypto = require("crypto");


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "User must have a name."],
        trim: true,
        minLength: [3, "User's name length must be between 2 & 20 characters."],
        maxLength: [20, "User's name length must be between 2 & 20 characters."]
    },
    email: {
        type: String,
        unique: [true, "Email must be unique."],
        required: [true, "User must have an email."],
        trim: true,
        validate: [validator.isEmail, "Your email is not valid."],
        lowercase: true
    },
    password: {
        type: String,
        required: [true, "User must have a password."],
        select: false,
        minLength: [8, "Password must be longer than 7 characters."]
    },
    passwordConfirm: {
        type: String,
        required: [true, "User must have passwordConfirm."],
        select: false,
        validate: {
            validator: function (val) {
                return this.password === val
            },
            message: "Password and PasswordConfirm values do not match!"
        }
    },
    role: {
        type: String,
        enum: ["admin", "user", "owner"],
        default: "user",
        trim: true,
        lowercase: true
    },
    phone: String,
    photo: {
        type: String,
        default: "default.jpg"
    },
    createdAt: {
        type: Date,
        default: Date.now(),
    },

    passwordChangedAt: {
        type: Date,
    },
    passwordResetToken: String,
    passwordResetTokenExpires: Date,
});

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) { return next() }
    this.passwordChangedAt = Date.now() - 1000
    next()
});
// Hashing Password before it is stored & Set Date of changing password
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) { return next() }
    this.password = await bcrypt.hash(this.password, 12)
    console.log("password", this.password)
    this.passwordConfirm = undefined
    this.passwordChangedAt = Date.now() - 1000
    next()
});

// Compare Passwords when logging in
userSchema.methods.correctPassword = async function (password, hashPassword) {
    return await bcrypt.compare(password, hashPassword);
}

// Check if user changed password after token was issued
userSchema.methods.passwordChangedAfter = function (JWTTimestamp) {
    if (!this.passwordChangedAt) { return false }
    return this.passwordChangedAt.getTime() / 1000 > JWTTimestamp
}

// Generate random password reset token
userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString("hex")
    this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex")
    this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000

    return resetToken
}


const User = mongoose.model("User", userSchema);
module.exports = User