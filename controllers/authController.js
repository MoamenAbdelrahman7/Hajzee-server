const catchAsync = require("../utils/catchAsync")
const User = require("./../models/user")
const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const AppError = require("../utils/appError")
const util = require("util")
const Email = require("./../utils/email")
const { excludeFieldsFilter } = require("./../utils/filterReqBody")

const setAuthHeader = (res, token) => {
    /*
    res.cookie("jwt", token, {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true,
        sameSite: "Strict",
        secure: process.env.NODE_ENV === "production"
    })
    */

    res.setHeader("Authorization", `Bearer ${token}`)
}

exports.signUp = catchAsync(async (req, res, next) => {
    let filter = excludeFieldsFilter(req.body, ["createdAt", "passwordChangedAt", "passwordResetToken", "passwordResetTokenExpires"])

    const user = await User.create(filter)

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    })

    setAuthHeader(res, token)


    res.status(200).json({
        status: "success",
        data: { user }
    });
});

exports.login = catchAsync(async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password

    const user = await User.findOne({ email }).select("+password");
    if (!user) { return next(new AppError("Incorrect email or password.", 404)) }

    const isMatched = await user.correctPassword(password, user.password)
    if (!isMatched) { return next(new AppError("Incorrect email or password.", 404)) }

    // Prevent admins from using the regular user/owner login endpoint
    if (user.role === "admin") {
        return next(new AppError("Admins must log in via the admin portal.", 403))
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });

    setAuthHeader(res, token)

    res.status(200).json({
        status: "success",
        message: "Logged in successfully."
    })
});

// Dedicated admin login endpoint to prevent users/owners from logging in as admin and vice versa
exports.loginAdmin = catchAsync(async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password

    const user = await User.findOne({ email }).select("+password");
    if (!user) { return next(new AppError("Incorrect email or password.", 404)) }

    const isMatched = await user.correctPassword(password, user.password)
    if (!isMatched) { return next(new AppError("Incorrect email or password.", 404)) }

    // Only admins can use the admin login endpoint
    if (user.role !== "admin") {
        return next(new AppError("Only admins can log in here.", 403))
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });

    setAuthHeader(res, token)

    res.status(200).json({
        status: "success",
        message: "Admin logged in successfully."
    })
});

exports.protect = catchAsync(async (req, res, next) => {
    // 1) Getting token and check if it is there
    // const token = req.cookies.jwt
    let token;
    if (req.headers["authorization"] && req.headers["authorization"].startsWith("Bearer")) {
        token = req.headers["authorization"].split(" ")[1]
        console.log(req.headers);
    }
    if (!token) { return next(new AppError("You are not authorized! Please log in to access.", 401)) }

    // 2) Token verification

    const decodded = await util.promisify(jwt.verify)(token, process.env.JWT_SECRET)
    if (!decodded) { return next(new AppError("Your token is invalid! Please log in to access", 401)) }
    // console.log(decodded)

    // 3)  Check if user still exists
    const user = await User.findById(decodded.id)
    if (!user) { return next(new AppError("User with this token does not exist, Please log in again.", 401)) }

    // 4) Check if user changed password after token was issued

    if (user.passwordChangedAfter(decodded.iat)) {
        return next(new AppError("User recently changed the password, Please log in again.", 401))
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = user
    next()
});

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError("You are not authorized to access this route.", 403))
        }
        next()
    }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based on POSTed email 
    const user = await User.findOne({ email: req.body.email })
    if (!user) { return next(new AppError("There is no user with that email address.", 404)) }

    // 2) Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 3) Send it to user's email
    const resetURL = `${req.protocol}://${req.get("host")}/users/resetPassword/${resetToken}`
    const message = `Forgot your password? submit a PATCH request with your new password and 
PasswordConfirm to: ${resetURL}\n if you didn't forget your password, Please ignore this email.`
    console.log(resetURL)

    try {
        new Email(user).sendPasswordResetURL({
            email: user.email,
            subject: "Password Reset Token",
            message: message
        })
    } catch (err) {
        user.passwordResetToken = undefined
        user.passwordResetTokenExpires = undefined
        await user.save({ validateBeforeSave: false })
        return next(new AppError(`Somthing went wrong while sending email!\nerror (${err.message})`, 500))
    }

    res.status(200).json({
        status: "success",
        message: "Reset token sent to email successfully.",
        resetToken
    })
})

exports.resetPassword = catchAsync(async (req, res, next) => {
    // 1) Get user based of the token
    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetTokenExpires: { $gte: Date.now() } })
    if (!user) { return new AppError("Token is invalid or has expired, Please try again.", 400) }

    // 2) If the token has not expired, and there is a user , set the new password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm
    user.passwordResetToken = undefined
    user.passwordResetTokenExpires = undefined
    // 3) Update changedPasswordAt property for the user
    user.passwordChangedAt = Date.now()
    await user.save()

    // 4) Log the user in, send JWT.
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });

    setAuthHeader(res, token)

    res.status(200).json({
        status: "success",
        message: "Password reset successfully."
    })
})

exports.updatePassword = catchAsync(async (req, res, next) => {
    if (!req.body.currentPassword) {
        return next(new AppError("Please provide your current password.", 400))
    }
    if (!req.body.newPassword || !req.body.newPasswordConfirm) {
        return next(new AppError("Please provide newPassword & newPasswordConfirm.", 400))
    }

    const user = await User.findById(req.user.id).select("+password")
    if (!user) { return next(new AppError("You are not authorized, Please log in to access.", 401)) }

    const isMatched = await user.correctPassword(req.body.currentPassword, user.password);
    if (!isMatched) { return next(new AppError("Your current password is incorrect! Please try again.", 401)) }

    user.password = req.body.newPassword;
    user.passwordConfirm = req.body.newPasswordConfirm;
    await user.save();

    res.status(200).json({
        status: "success",
        message: "Password updated sccuessfully, Please log in again."
    })

});