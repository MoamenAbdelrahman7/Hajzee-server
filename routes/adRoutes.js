const express = require("express")
const router = express.Router()
const adController = require("../controllers/adController")
const authController = require("../controllers/authController")

// Public routes - No authentication required
router.get("/active", adController.getActiveAds)
router.patch("/:id/impression", adController.trackImpression)
router.patch("/:id/click", adController.trackClick)

// Protected routes - Authentication required
router.use(authController.protect)

// Admin only routes - Full CRUD operations

router
  .route("/")
  .get(adController.getAllAds)
  .post(authController.restrictTo("admin"),
    adController.uploadAdImage,
    adController.resizeAdImage,
    adController.createAd
  )

router
  .route("/:id")
  .get(adController.getAd)
  .patch(
    adController.uploadAdImage,
    adController.resizeAdImage,
    adController.updateAd
  )
  .delete(adController.deleteAd)

// Additional admin routes
router.patch("/:id/toggle-status", adController.toggleAdStatus)
router.get("/:id/analytics", adController.getAdAnalytics)
router.get("/stats/overview", adController.getAdsStats)

module.exports = router
