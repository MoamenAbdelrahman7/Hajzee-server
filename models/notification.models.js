const mongoose = require("mongoose")

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Notification must have a recipient"],
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
  },
  playground: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PlayGround",
  },
  type: {
    type: String,
    enum: [
      "general",
      "booking_created",
      "booking_confirmed",
      "booking_canceled",
      "booking_completed",
    ],
    default: "general",
  },
  title: {
    type: String,
  },
  message: {
    type: String,
    required: [true, "Notification must have a message"],
    trim: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

notificationSchema.pre(/^find/, function (next) {
  this.populate("sender").populate("recipient").populate("playground").populate("booking")
  next()
})

const Notification = mongoose.model("Notification", notificationSchema)
module.exports = Notification


