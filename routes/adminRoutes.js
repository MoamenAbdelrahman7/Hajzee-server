const express = require("express")
const router = express.Router()
const adminController = require("./../controllers/adminController.js")
const authController = require("./../controllers/authController.js")

// Protect all admin routes - only authenticated admins can access
router.use(authController.protect)
router.use(authController.restrictTo("admin"))

// Admin routes
router.route("/clear-data")
    .delete(adminController.clearAllData)

router.route("/stats")
    .get(adminController.getDatabaseStats)

module.exports = router
