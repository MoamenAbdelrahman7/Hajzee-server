const mongoose = require("mongoose");
const User = require("./user.js");

const playGroundSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "'Name' field could not be empty !"],
        trim: true,
        minLength: [2, "Name of playground must be greater than 1 charachters!"],
        maxLength: [39, "Name of playground must be less than 40 charachters!"],
    },
    location: {
        type: String,
        required: [true, "'Location' field could not be empty !"],
        trim: true,
        minLength: [5, "Location of playground must be greater than 4 charachters!"],
        maxLength: [255, "Location of playground must be less than 255 charachters!"],
    },
    googleMapUrl: {String},
    appleMapUrl: {String},
    costPerHour: {
        type: Number,
        required: [true, "You must provide the cost per hour of playground !"],

    },
    ratings: {
        type: Number,
        default: 0.0
    },
    imageCover: {
        type: String,
        required: [true, "You must attach image Cover of playground !"]
    },
    images: {
        type: [String],
        required: [true, "You must attach images of playground !"]
    },
    openingTime: { // NEED TO BE CHANGED
        type: String,
        required: [true, "'OpenningTime' field could not be empty !"]
    },
    closingTime: {   // NEED TO BE CHANGED
        type: String,
        required: [true, "'closingTime' field could not be empty !"]
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        // required: [true, "'Owner' field could not be empty !"]
    },
    // playGroundCapacities: {
    //     type: [Object], // E.g: [{ teamSize: 5, isIndoor: false, }]
    //     required: [true, "Playground must have capacity values ( E.g: [{ teamSize: 5, isIndoor: false, }] )"]
    // },
    size: {
        type: Number,
        required: [true, "Playground must have a size!"]
    }
    // bookings: {
    // type: mongoose.Schema.Types.ObjectId,
    //     ref: "Booking"
    // }
});

playGroundSchema.virtual("bookings", {
    ref: "Booking",
    foreignField: "playground",
    localField: "_id"
})


playGroundSchema.pre("find", function (next) {
    this.populate("owner")
    next()
})


const PlayGround = mongoose.model("PlayGround", playGroundSchema);

module.exports = PlayGround;











