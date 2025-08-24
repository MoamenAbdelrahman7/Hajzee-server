const PlayGround = require("../models/playGround.models.js");
const mongoose = require("mongoose")
const catchAsync = require("./../utils/catchAsync.js")
const Booking = require("./../models/booking.models.js")
const AppError = require("./../utils/appError.js")
const { createNotification } = require("./notificationController")
const crypto = require("crypto")
const multer = require("multer")
const sharp = require("sharp")
const { includeFieldsFilter, excludeFieldsFilter } = require("../utils/filterReqBody");
const Favourites = require("../models/favourites.js");


const multerStorage = multer.memoryStorage()
const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
        cb(null, true)
    } else {
        cb(new AppError("Not an image! Please upload only images."), false)
    }
}

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
})

exports.uploadPlaygroundImages = upload.fields([
    { name: "imageCover", maxCount: 1 },
    { name: "images", maxCount: 8 }
])

exports.resizePlaygroundImages = catchAsync(async (req, res, next) => {
    console.log("resizePlaygroundImages req.files", req.files);
    if (!req.files) { return next() }

    // Resize imageCover if provided
    if (req.files.imageCover && req.files.imageCover.length > 0) {
        let tempId = crypto.randomBytes(12).toString("hex")
        req.body.imageCover = `playground-${tempId}-${Date.now()}-cover.jpeg`

        await sharp(req.files.imageCover[0].buffer)
            .resize(2000, 1333)
            .toFormat("jpeg")
            .jpeg({ quality: 90 })
            .toFile(`public/img/playgrounds/${req.body.imageCover}`)
    }

    // Resize images if provided
    if (req.files.images && req.files.images.length > 0) {
        let tempId = crypto.randomBytes(12).toString("hex")
        req.body.images = []
        await Promise.all(req.files.images.map(async (file, i) => {
            let filename = `playground-${tempId}-${Date.now()}-${i}-.jpeg`
            await sharp(file.buffer)
                .resize(512, 512)
                .toFormat("jpeg")
                .jpeg({ quality: 90 })
                .toFile(`public/img/playgrounds/${filename}`)
            req.body.images.push(filename)
        }))
    }
    console.log("req.body.imageCover, ", req.body.imageCover);
    console.log("req.body.images, ", req.body.images);

    
    next()
})


exports.getPlayGrounds = async (req, res) => {
    const playgrounds = await PlayGround.find()
    return res.status(200).json({
        status: "success",
        result: {
            length: playgrounds.length,
            data: playgrounds
        }
    })
}

exports.getPlayGround = async (req, res) => {
    console.log(req.params);
    const id = req.params.id
    const playground = await PlayGround.findById(id)
    return res.status(200).json({
        status: "success",
        result: {
            data: playground
        }
    })
}
exports.getOwnerPlayGrounds = async (req, res) => {
    const owner = req.user.id
    console.log({ owner });

    const playgrounds = await PlayGround.find({ owner: owner }).populate("bookings")
    return res.status(200).json({
        status: "success",
        results: playgrounds.length,
        result: {
            data: playgrounds
        }
    })
}

exports.createPlayGround = async (req, res) => {
    // req.body.owner = new mongoose.Types.ObjectId(req.body.owner)
    console.log("req.body", req.body);

    req.body.owner = req.user.id
    const playground = await PlayGround.create(req.body)
    return res.status(201).json({
        status: "success",
        result: {
            data: playground //.populate("owner")
        }
    })
}


exports.updatePlayGround = catchAsync(async (req, res, next) => {
    const id = req.params.id
    console.log("updatePlayGround req.body", req.body);
    const updatedPlayGround = await PlayGround.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true
    })
    return res.status(200).json({
        status: "success",
        result: {
            data: updatedPlayGround
        }
    })
})

exports.deletePlayGround = async (req, res) => {
    const id = req.params.id
    await PlayGround.findByIdAndDelete(id)
    return res.status(204).json({
        status: "success",
    })
}

function isConflictingBooking(newStart, newEnd, existingBookings) {
    const newStartTime = new Date(newStart).getTime();
    const newEndTime = new Date(newEnd).getTime();

    return existingBookings.find(({ start, end }) => {
        // console.log({ start, end });

        const existingStart = new Date(start).getTime();
        // console.log(existingStart);

        const existingEnd = new Date(end).getTime();
        // console.log(`existingStart, ${new Date(existingStart)}, existingEnd, ${new Date(existingEnd)}`);

        // console.log({ newStartTime, existingStart, newEndTime, existingEnd });

        // Return true if there is overlap
        // console.log((newStartTime > existingStart && newStartTime < existingEnd) || (newEndTime > existingStart && newEndTime < existingEnd) || (newStartTime < existingEnd && newEndTime > existingStart));

        return (newStartTime > existingStart && newStartTime < existingEnd) ||
            (newEndTime > existingStart && newEndTime < existingEnd) ||
            (newStartTime < existingEnd && newEndTime > existingStart)
    });
}

exports.bookPlayground = catchAsync(async (req, res, next) => {
    const id = req.params.id // playground id
    const pgBookings = await Booking.find({ playground: id, status: { $in: ["pending", "confirmed"] } })
    console.log("req.body", req.body);


    const { date, duration, size, startTime } = req.body

    const [year, month, day] = date.split("-").map(el => parseInt(el))
    const [hour, minute] = startTime.split(":").map(el => parseInt(el))
    console.log({ year, month, day, hour, minute });

    const startdate = new Date(Date.UTC(year, month - 1, day, hour, minute))

    const endDate = new Date(startdate.getTime() + duration * 60 * 60 * 1000)
    console.log("date,", startdate, "end", endDate);



    const conflict = isConflictingBooking(startdate, endDate, pgBookings)

    if (conflict) {
        // console.log(`There is a conflict with another booking(start: ${conflict.start}, end: ${conflict.end} )!`);

        return res.status(409).json({
            status: "failed",
            message: `There is a conflict with another booking(start: ${conflict.start}, end: ${conflict.end} )!`,
            conflict: {
                start: conflict.start,
                end: conflict.end
            }
        })
    }

    const temp = await Booking.create({ start: startdate, end: endDate, playground: id, user: req.user.id,cost: req.body.cost})
    const booking = await Booking.findById(temp.id)
    if (!booking) { return next(new AppError("Booking does not created properly!", 400)) }

    console.log("Your booking is successful.");

    // Create notifications for user and owner
    try {
        const playground = booking.playground
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
        console.log("Notification error (bookPlayground):", e.message)
    }


    res.status(200).json({
        status: "success",
        message: `Your booking is successful.\nBooking id: ${booking.id}`,
        booking: booking
    })
})

exports.getUserFavourites = catchAsync(async (req, res, next) => {
    const favourites = await Favourites.find({ user: req.user.id })
    console.log(favourites);
    console.log({ user: req.user.id });


    res.status(200).json({
        status: "success",
        results: favourites.length,
        data: favourites
    })
})
exports.addToFavourites = catchAsync(async (req, res, next) => {
    const { playground } = req.body
    const tempFav = await Favourites.create({ playground, user: req.user.id })

    res.status(201).json({
        status: "success",
        result:
            tempFav

    })
})
exports.removeFromFavourites = catchAsync(async (req, res, next) => {
    const { playground } = req.body
    await Favourites.deleteOne({ playground, user: req.user.id })

    res.status(204).json({
        status: "success",
        message: "Favourite playground removed Successfully."

    })
})
