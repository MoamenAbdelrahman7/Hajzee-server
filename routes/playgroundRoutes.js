
const express = require("express");
const playGroundControllers = require("../controllers/playGroundControllers.js");
const authControllers = require("../controllers/authController.js");
const router = express.Router();

router.use(authControllers.protect)

router
    .route("/")
    .get(playGroundControllers.getPlayGrounds)
    .post(authControllers.restrictTo("owner"),playGroundControllers.uploadPlaygroundImages, playGroundControllers.resizePlaygroundImages, playGroundControllers.createPlayGround)

router.route("/owner")
    .get(authControllers.restrictTo("owner"), playGroundControllers.getOwnerPlayGrounds)

router
    .route("/:id")
    .get(playGroundControllers.getPlayGround)
    .patch(authControllers.restrictTo("owner"),playGroundControllers.uploadPlaygroundImages, playGroundControllers.resizePlaygroundImages, playGroundControllers.updatePlayGround)
    .delete(playGroundControllers.deletePlayGround)


router.route("/:id/book")
    .post(playGroundControllers.bookPlayground) // id is for playground

module.exports = router





