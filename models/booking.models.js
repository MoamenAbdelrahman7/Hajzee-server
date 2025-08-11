const mongoose = require("mongoose")

const bookingSchema = new mongoose.Schema({
    start: Date,
    end: Date,
    playground: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PlayGround",
        required: [true, "Booking must belongs to a playground!"]
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Booking must belongs to a user!"]

    },
    cost: {
        type: Number,
        default: 0,
    },
    
    status: {
        type: String,
        enum: ["pending", "confirmed", "canceled", "completed"],
        default: "pending"
    },
    createdAt: {
        type: Date,
        default: Date.now()
    }
})

bookingSchema.pre(/^find/, function (next) {
    this.populate("playground")
    this.populate("user")
    next()
})

const Booking = mongoose.model("Booking", bookingSchema)

module.exports = Booking