const mongoose = require("mongoose")

const favouritesSchema = new mongoose.Schema({
    playground: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PlayGround",
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
})

favouritesSchema.pre(/^find/, function (next) {
    this.populate("playground")
    // this.populate("user")
    next()
})

const Favourites = mongoose.model("Favourites", favouritesSchema)
module.exports = Favourites