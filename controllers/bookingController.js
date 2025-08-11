const Booking = require("../models/booking.models")
const catchAsync = require("../utils/catchAsync")
const AppError = require("./../utils/appError")
const PlayGround = require("../models/playGround.models")
const { createNotification } = require("./notificationController")

// Get all bookings
exports.getAllBookings = catchAsync(async (req, res, next) => {
    const bookings = await Booking.find()

    res.status(200).json({
        status: "success",
        length: bookings.length,
        data: bookings
    })
})

// Get single booking by ID
exports.getBooking = catchAsync(async (req, res, next) => {
    const booking = await Booking.findById(req.params.id)
    
    if (!booking) {
        return next(new AppError(`No booking found with id: ${req.params.id}`, 404))
    }

    res.status(200).json({
        status: "success",
        data: booking
    })
})

exports.getMyBookings = catchAsync(async (req, res, next) => {
    const bookings = await Booking.find({ user: req.user.id })
    res.status(200).json({
        status: "success",
        result: bookings
    })
})
// Create new booking
exports.createBooking = catchAsync(async (req, res, next) => {
    const newBooking = await Booking.create(req.body)
    // Notify user and playground owner
    try {
        const booking = await Booking.findById(newBooking._id)
        const playground = booking.playground || (await PlayGround.findById(booking.playground))
        const ownerId = playground.owner
        await Promise.all([
            createNotification({
                recipient: booking.user,
                sender: booking.user,
                booking: booking._id,
                playground: booking.playground,
                type: "booking_created",
                title: "Booking created",
                message: "Your booking has been created and is pending confirmation.",
            }),
            createNotification({
                recipient: ownerId,
                sender: booking.user,
                booking: booking._id,
                playground: booking.playground,
                type: "booking_created",
                title: "New booking request",
                message: "A new booking was requested for your playground.",
            }),
        ])
    } catch (e) {
        // Do not block the request on notification failures
        console.log("Notification error (createBooking):", e.message)
    }

    res.status(201).json({
        status: "success",
        message: "Booking created successfully",
        data: newBooking
    })
})

// Update booking
exports.updateBooking = catchAsync(async (req, res, next) => {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    })

    if (!booking) {
        return next(new AppError(`No booking found with id: ${req.params.id}`, 404))
    }

    res.status(200).json({
        status: "success",
        message: "Booking updated successfully",
        data: booking
    })
})

// Delete booking
exports.deleteBooking = catchAsync(async (req, res, next) => {
    const booking = await Booking.findByIdAndDelete(req.params.id)

    if (!booking) {
        return next(new AppError(`No booking found with id: ${req.params.id}`, 404))
    }

    res.status(204).json({
        status: "success",
        message: "Booking deleted successfully"
    })
})

// Get bookings for a specific playground
exports.getPlaygroundBookings = catchAsync(async (req, res, next) => {
    const bookings = await Booking.find({ playground: req.params.playgroundId })

    res.status(200).json({
        status: "success",
        length: bookings.length,
        result: bookings
    })
})

// Confirm booking
exports.confirmBooking = catchAsync(async (req, res, next) => {
    const booking = await Booking.findById(req.params.id)
    
    if (!booking) {
        return next(new AppError(`No booking found with id: ${req.params.id}`, 404))
    }

    if (booking.status === "confirmed") {
        return next(new AppError("This booking is already confirmed!", 409))
    }

    booking.status = "confirmed"
    await booking.save()

    // Notify user and owner
    try {
        const playground = booking.playground || (await PlayGround.findById(booking.playground))
        const ownerId = playground.owner
        await Promise.all([
            createNotification({
                recipient: booking.user,
                sender: ownerId,
                booking: booking._id,
                playground: booking.playground,
                type: "booking_confirmed",
                title: "Booking confirmed",
                message: "Your booking has been confirmed.",
            }),
            createNotification({
                recipient: ownerId,
                sender: ownerId,
                booking: booking._id,
                playground: booking.playground,
                type: "booking_confirmed",
                title: "You confirmed a booking",
                message: "You have confirmed a booking for your playground.",
            }),
        ])
    } catch (e) {
        console.log("Notification error (confirmBooking):", e.message)
    }

    res.status(200).json({
        status: "success",
        message: "Booking confirmed successfully",
        data: booking
    })
})

// Cancel booking
exports.cancelBooking = catchAsync(async (req, res, next) => {
    const booking = await Booking.findById(req.params.id)
    
    if (!booking) {
        return next(new AppError(`No booking found with id: ${req.params.id}`, 404))
    }

    if (booking.status === "canceled") {
        return next(new AppError("This booking is already canceled!", 409))
    }
    
    if (booking.status === "completed") {
        return next(new AppError("Cannot cancel a completed booking!", 400))
    }

    booking.status = "canceled"
    await booking.save()

    // Notify user and owner
    try {
        const playground = booking.playground || (await PlayGround.findById(booking.playground))
        const ownerId = playground.owner
        await Promise.all([
            createNotification({
                recipient: booking.user,
                sender: ownerId,
                booking: booking._id,
                playground: booking.playground,
                type: "booking_canceled",
                title: "Booking canceled",
                message: "Your booking has been canceled.",
            }),
            createNotification({
                recipient: ownerId,
                sender: booking.user,
                booking: booking._id,
                playground: booking.playground,
                type: "booking_canceled",
                title: "Booking canceled",
                message: "A booking was canceled.",
            }),
        ])
    } catch (e) {
        console.log("Notification error (cancelBooking):", e.message)
    }

    res.status(200).json({
        status: "success",
        message: "Booking canceled successfully",
        data: booking
    })
})