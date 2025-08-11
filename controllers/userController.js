const factory = require("./handlerFactory")
const User = require("./../models/user");
const {includeFieldsFilter} = require("./../utils/filterReqBody")
const catchAsync = require("../utils/catchAsync");
const AppError = require("./../utils/appError")
const multer = require("multer");
const sharp = require("sharp");
const crypto = require("crypto")

// Image upload using multer
const multerStorage = multer.memoryStorage();
const multerFilter = (req, file, cb) => {
    // Accept only images
    if(file.mimetype.startsWith("image")){ 
        cb(null, true)
    }else{
        cb(new AppError("Not an image! Please upload only images", 400), false) 
    }
}

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

exports.uploadUserPhoto = upload.single("photo");

// Images resize using sharp
exports.resizeUserPhoto = catchAsync( async (req, res, next)=>{
    if(!req.file){ return next() }
    let tempId;
    if(!req.user){
        tempId= crypto.randomBytes(12).toString("hex")
    }
    req.body.photo = `user-${req.user? req.user.id : tempId}-${Date.now()}.jpeg`

    await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat("jpeg")
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.body.photo}`)

    next()
});

exports.getUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);

// Get current user data
exports.getMe =  (req, res, next)=>{
    req.params.id = req.user?.id || req.body._id // req.user.id
    next()
}

// User updates his data
exports.updateMe = catchAsync( async (req, res, next)=>{

    if(req.body.password || req.body.passwordConfirm){ 
        return next(new AppError("This route is not for password updates! Please use /updatePassword", 400)) 
    } 

    let filter = includeFieldsFilter(req.body, ["name", "email", "photo", "phone"])
    
    // Note: pre middlwares won't work with findByIdAndUpdate.
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filter, { new: true, runValidators: true })
    if(!updatedUser){ return next(new AppError("You are not authroized to access this route.", 401)) }

    res.status(200).json({
        status: "success",
        data: {
            user: updatedUser
        }
    })
});

// User deletes his account
exports.deleteMe = catchAsync( async (req, res, next)=>{
    const password = req.body.password
    if (!password){ return next(new AppError("Please provide your password to confirm deletion.", 400)) }
    
    const user = await User.findById(req.user.id).select("+password")
    // 2) check user's password to confirm deletion
    const isMatched = await user.correctPassword(password, user.password)
    if (!isMatched){ return next(new AppError("Your password is incorrect! Please try again.", 401)) }
    
    res.status(204).json({
        status: "success",
        data: null
    })
});

exports.followUser = catchAsync(async (req, res, next)=>{
    const { followedUserId } = req.body

    const user = await User.findById(req.user.id)
    const followedUser = await User.findById(followedUserId)

    if(user.following.indexOf(followedUser) !== -1) return next(new AppError("You are already following this user.")) 
    user.following.push(followedUserId)
    user.save()
    
    if(followedUser.followers.indexOf(req.user.id) !== -1) return next(new AppError("You are already following this user.")) 
    followedUser.followers.push(req.user.id)
    followedUser.save()

    res.status(200).json({
        status: "success",
        message: `${user.name} is following ${followedUser.name}`
    })
})

















