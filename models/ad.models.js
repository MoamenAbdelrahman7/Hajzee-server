const mongoose = require("mongoose")

const adSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Ad must have a title"],
      trim: true,
      maxLength: [100, "Ad title must be less than 100 characters"]
    },
    description: {
      type: String,
      required: [true, "Ad must have a description"],
      trim: true,
      maxLength: [500, "Ad description must be less than 500 characters"]
    },
    image: {
      type: String,
      required: [true, "Ad must have an image"],
    },
    link: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v)
        },
        message: "Link must be a valid URL starting with http:// or https://"
      }
    },
    type: {
      type: String,
      enum: ["banner", "sidebar", "popup", "inline"],
      default: "banner",
      required: [true, "Ad must have a type"]
    },
    placement: {
      type: String,
      enum: ["home", "playgrounds", "profile", "chat", "all"],
      default: "all",
      required: [true, "Ad must have a placement"]
    },
    isActive: {
      type: Boolean,
      default: true
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      validate: {
        validator: function(v) {
          return !v || v > this.startDate
        },
        message: "End date must be after start date"
      }
    },
    clickCount: {
      type: Number,
      default: 0
    },
    impressionCount: {
      type: Number,
      default: 0
    },
    targetAudience: {
      userRole: {
        type: String,
        enum: ["all", "user", "owner", "admin"],
        default: "all"
      },
      minAge: {
        type: Number,
        min: 13,
        max: 100
      },
      maxAge: {
        type: Number,
        min: 13,
        max: 100
      },
      location: String
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 10
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

// Virtual for click-through rate
adSchema.virtual("ctr").get(function() {
  return this.impressionCount > 0 ? (this.clickCount / this.impressionCount * 100).toFixed(2) : 0
})

// Check if ad is currently active based on dates
adSchema.virtual("isCurrentlyActive").get(function() {
  const now = new Date()
  const isWithinDateRange = now >= this.startDate && (!this.endDate || now <= this.endDate)
  return this.isActive && isWithinDateRange
})

// Index for efficient querying
adSchema.index({ isActive: 1, placement: 1, startDate: 1, endDate: 1 })
adSchema.index({ priority: -1 })

// TTL index to automatically delete documents when endDate is reached
// MongoDB will automatically delete documents where endDate has passed
adSchema.index({ endDate: 1 }, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { endDate: { $exists: true } }
})

// Pre-find middleware to populate createdBy
adSchema.pre(/^find/, function(next) {
  this.populate("createdBy", "name email")
  next()
})

const Ad = mongoose.model("Ad", adSchema)
module.exports = Ad
