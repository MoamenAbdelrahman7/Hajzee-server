const AppError = require("../utils/appError")
const catchAsync = require("../utils/catchAsync")
const APIFeatures = require("../utils/apiFeatures")


exports.createOne = (Model, filterFunction = null, excludedFields = [], customFilter = null) => catchAsync(async (req, res, next) => {
    let filter = {}
    if (filterFunction) { filter = filterFunction(req.body, excludedFields) }
    if (customFilter) { customFilter(req, filter) }
    // console.log(filter)

    const tempDoc = await Model.create(filter)
    const doc = await Model.findById(tempDoc._id)

    res.status(200).json({
        status: "success",
        data: {
            data: doc
        }
    })
})

exports.getOne = (Model, customFilter = null) => catchAsync(async (req, res, next) => {
    let filter = {}
    if (customFilter) { filter = customFilter(req) }
    else { filter._id = req.params.id }

    const doc = await Model.findOne(filter)
    if (!doc) { return next(new AppError(`There is no document with that id !`, 404)) }
    console.log(doc);

    if (doc.user && !doc.verifyUser(req.user)) { return next(new AppError("You are not authorized to access this document.", 401)) }

    res.status(200).json({
        status: "success",
        data: doc
    })
})

exports.getAll = (Model, customFilter = null) => catchAsync(async (req, res, next) => {
    let filter = {}
    if (customFilter) { filter = customFilter(req) }
    const features = new APIFeatures(Model.find(filter), req.query)
    features.filter().sort().limitFields().paginate();

    const docs = await features.query;

    res.status(200).json({
        status: "success",
        results: docs.length,
        data: docs
    })
});

exports.updateOne = (Model, filterFunction = null, allowedFields = [], customFilter = null, updateCustomConfig = {}) => catchAsync(async (req, res, next) => {

    const doc = await Model.findById(req.params.id)
    if (!doc) { return next(new AppError("There is no document with that id !", 404)) }

    let filter = {}
    if (filterFunction) { filter = filterFunction(req.body, allowedFields) }
    if (customFilter) { filter = customFilter(req, filter) }

    if (doc.user && !doc.verifyUser(req.user)) { return next(new AppError("You are not authorized to access this document.", 401)) }

    await Model.findByIdAndUpdate(req.params.id, { $set: filter }, { new: true, runValidators: true })
    const updatedDoc = await Model.findById(req.params.id)

    res.status(200).json({
        status: "success",
        data: {
            updatedDoc
        }
    })
});

exports.deleteOne = (Model, customFilter = null) => catchAsync(async (req, res, next) => {
    const doc = await Model.findById(req.params.id)
    if (!doc) { return next(new AppError("There is no document with that id !", 404)) }

    if (doc.user && !doc.verifyUser(req.user)) { return next(new AppError("You are not authorized to access this document.", 401)) }

    await Model.findOneAndDelete({ _id: doc.id })

    res.status(204).json({
        status: "success",
        data: null
    })
});


