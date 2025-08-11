const express = require("express")
const router = express.Router()
const playgroundControllers = require("./../controllers/playGroundControllers.js")
const authController = require("./../controllers/authController.js")

router.use(authController.protect)
router
    .route("/")
    .get(playgroundControllers.getUserFavourites)
    .post(playgroundControllers.addToFavourites)
    .delete(playgroundControllers.removeFromFavourites)


module.exports = router