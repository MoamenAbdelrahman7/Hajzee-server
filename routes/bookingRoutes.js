const express = require("express")
const router = express.Router()
const bookingController = require("./../controllers/bookingController.js")
const authController = require("./../controllers/authController.js")

router.use(authController.protect)
// CRUD routes for bookings
router.route("/")
    .get(bookingController.getAllBookings)
    .post(bookingController.createBooking)
    
router.route("/my-bookings")
    .get(bookingController.getMyBookings)

router.route("/:id")
    .get(bookingController.getBooking)
    .patch(bookingController.updateBooking)
    .delete(bookingController.deleteBooking)

// Special action routes
router.route("/:id/confirm")
    .patch(bookingController.confirmBooking)

router.route("/:id/cancel")
    .patch(bookingController.cancelBooking)


// Get bookings for a specific playground
router.route("/playground/:playgroundId")
    .get(bookingController.getPlaygroundBookings)

module.exports = router