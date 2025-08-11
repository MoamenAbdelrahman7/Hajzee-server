const Notification = require("../models/notification.models")
const catchAsync = require("../utils/catchAsync")
const AppError = require("../utils/appError")

exports.getMyNotifications = catchAsync(async (req, res, next) => {
  const notifications = await Notification.find({ recipient: req.user.id }).sort({ createdAt: -1 })

  res.status(200).json({
    status: "success",
    length: notifications.length,
    data: notifications,
  })
})

exports.markAsRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { isRead: true },
    { new: true }
  )

  if (!notification) {
    return next(new AppError("Notification not found", 404))
  }

  res.status(200).json({
    status: "success",
    data: notification,
  })
})

exports.deleteNotification = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user.id })
  if (!notification) { return next(new AppError("Notification not found", 404)) }

  res.status(204).json({ status: "success" })
})

exports.createNotification = async ({ recipient, sender, booking, playground, type, title, message }) => {
  // Utility for internal use (no route). Not wrapped with catchAsync on purpose.
  return Notification.create({ recipient, sender, booking, playground, type, title, message })
}


