const Ad = require("../models/ad.models")
const catchAsync = require("../utils/catchAsync")
const AppError = require("../utils/appError")
const APIFeatures = require("../utils/apiFeatures")
const multer = require("multer")
const sharp = require("sharp")
const path = require("path")

// Configure multer for ad image uploads
const multerStorage = multer.memoryStorage()

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true)
  } else {
    cb(new AppError("Not an image! Please upload only images.", 400), false)
  }
}

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
})

exports.uploadAdImage = upload.single("image")

exports.resizeAdImage = catchAsync(async (req, res, next) => {
  if (!req.file) return next()

  req.file.filename = `ad-${req.user.id}-${Date.now()}.jpeg`

  await sharp(req.file.buffer)
    // .resize(800, 400)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/ads/${req.file.filename}`)

  next()
})

// Public endpoints - Get active ads for display
exports.getActiveAds = catchAsync(async (req, res, next) => {
  const { placement, type } = req.query
  
  const filter = {
    isActive: true,
    startDate: { $lte: new Date() },
    $or: [
      { endDate: { $exists: false } },
      { endDate: { $gte: new Date() } }
    ]
  }

  if (placement && placement !== "all") {
    filter.$or = [
      { placement: placement },
      { placement: "all" }
    ]
  }

  if (type) {
    filter.type = type
  }

  const ads = await Ad.find(filter)
    .sort({ priority: -1, createdAt: -1 })
    .select("-clickCount -impressionCount -createdBy")
    .limit(10)

  res.status(200).json({
    status: "success",
    results: ads.length,
    data: ads
  })
})

// Track ad impression
exports.trackImpression = catchAsync(async (req, res, next) => {
  const { id } = req.params

  await Ad.findByIdAndUpdate(id, {
    $inc: { impressionCount: 1 }
  })

  res.status(200).json({
    status: "success",
    message: "Impression tracked"
  })
})

// Track ad click
exports.trackClick = catchAsync(async (req, res, next) => {
  const { id } = req.params

  const ad = await Ad.findByIdAndUpdate(id, {
    $inc: { clickCount: 1 }
  }, { new: true })

  if (!ad) {
    return next(new AppError("Ad not found", 404))
  }

  res.status(200).json({
    status: "success",
    message: "Click tracked",
    data: {
      link: ad.link
    }
  })
})

// Admin endpoints - Full CRUD operations
exports.getAllAds = catchAsync(async (req, res, next) => {
  const features = new APIFeatures(Ad.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate()

  const ads = await features.query

  res.status(200).json({
    status: "success",
    results: ads.length,
    data: ads
  })
})

exports.getAd = catchAsync(async (req, res, next) => {
  const ad = await Ad.findById(req.params.id)

  if (!ad) {
    return next(new AppError("Ad not found", 404))
  }

  res.status(200).json({
    status: "success",
    data: ad
  })
})

exports.createAd = catchAsync(async (req, res, next) => {
  // Add image filename if uploaded
  if (req.file) {
    req.body.image = req.file.filename
  }

  // Add creator
  req.body.createdBy = req.user.id

  const newAd = await Ad.create(req.body)

  res.status(201).json({
    status: "success",
    data: newAd
  })
})

exports.updateAd = catchAsync(async (req, res, next) => {
  // Add image filename if uploaded
  if (req.file) {
    req.body.image = req.file.filename
  }

  const ad = await Ad.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  })

  if (!ad) {
    return next(new AppError("Ad not found", 404))
  }

  res.status(200).json({
    status: "success",
    data: ad
  })
})

exports.deleteAd = catchAsync(async (req, res, next) => {
  const ad = await Ad.findByIdAndDelete(req.params.id)

  if (!ad) {
    return next(new AppError("Ad not found", 404))
  }

  res.status(204).json({
    status: "success",
    data: null
  })
})

// Toggle ad active status
exports.toggleAdStatus = catchAsync(async (req, res, next) => {
  const ad = await Ad.findById(req.params.id)

  if (!ad) {
    return next(new AppError("Ad not found", 404))
  }

  ad.isActive = !ad.isActive
  await ad.save()

  res.status(200).json({
    status: "success",
    data: ad
  })
})

// Get ad analytics
exports.getAdAnalytics = catchAsync(async (req, res, next) => {
  const { id } = req.params

  const ad = await Ad.findById(id)

  if (!ad) {
    return next(new AppError("Ad not found", 404))
  }

  const analytics = {
    id: ad._id,
    title: ad.title,
    impressions: ad.impressionCount,
    clicks: ad.clickCount,
    ctr: ad.ctr,
    isActive: ad.isCurrentlyActive,
    daysRunning: Math.ceil((new Date() - ad.startDate) / (1000 * 60 * 60 * 24))
  }

  res.status(200).json({
    status: "success",
    data: analytics
  })
})

// Get overall ads statistics
exports.getAdsStats = catchAsync(async (req, res, next) => {
  const stats = await Ad.aggregate([
    {
      $group: {
        _id: null,
        totalAds: { $sum: 1 },
        activeAds: {
          $sum: {
            $cond: [{ $eq: ["$isActive", true] }, 1, 0]
          }
        },
        totalImpressions: { $sum: "$impressionCount" },
        totalClicks: { $sum: "$clickCount" },
        avgCTR: {
          $avg: {
            $cond: [
              { $gt: ["$impressionCount", 0] },
              { $multiply: [{ $divide: ["$clickCount", "$impressionCount"] }, 100] },
              0
            ]
          }
        }
      }
    }
  ])

  const adsByType = await Ad.aggregate([
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        impressions: { $sum: "$impressionCount" },
        clicks: { $sum: "$clickCount" }
      }
    }
  ])

  const adsByPlacement = await Ad.aggregate([
    {
      $group: {
        _id: "$placement",
        count: { $sum: 1 },
        impressions: { $sum: "$impressionCount" },
        clicks: { $sum: "$clickCount" }
      }
    }
  ])

  res.status(200).json({
    status: "success",
    data: {
      overview: stats[0] || {},
      byType: adsByType,
      byPlacement: adsByPlacement
    }
  })
})
