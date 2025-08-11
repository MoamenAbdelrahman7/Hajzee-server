const catchAsync = require("../utils/catchAsync")
const AppError = require("./../utils/appError")
const User = require("../models/user")
const PlayGround = require("../models/playGround.models")
const Booking = require("../models/booking.models")
const Favourites = require("../models/favourites")

// Clear all database data
exports.clearAllData = catchAsync(async (req, res, next) => {
    // Delete all data from all collections
    await User.deleteMany({})
    await PlayGround.deleteMany({})
    await Booking.deleteMany({})
    await Favourites.deleteMany({})

    res.status(200).json({
        status: "success",
        message: "All database data has been cleared successfully",
        data: {
            usersDeleted: true,
            playgroundsDeleted: true,
            bookingsDeleted: true,
            favouritesDeleted: true
        }
    })
})

// Get database statistics
exports.getDatabaseStats = catchAsync(async (req, res, next) => {
    const userCount = await User.countDocuments()
    const playgroundCount = await PlayGround.countDocuments()
    const bookingCount = await Booking.countDocuments()
    const favouritesCount = await Favourites.countDocuments()

    res.status(200).json({
        status: "success",
        data: {
            users: userCount,
            playgrounds: playgroundCount,
            bookings: bookingCount,
            favourites: favouritesCount,
            total: userCount + playgroundCount + bookingCount + favouritesCount
        }
    })
})
