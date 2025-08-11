const AppError = require("./../utils/appError.js");
const sendErrorDev = (err, res)=>{
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack

    })
}

const sendErrorProd = (err, res)=>{
    if(err && err.isOperational){
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        })
    }else{
        res.status(500).json({
            status: "error",
            message: "somthing went very wrong!",
        })
    }
}

const handleCastErrorDB = (err)=>{

    const message = `Invalid ${err.path}: ${err.value} !`
    return new AppError(message, 400)  // 400 for bad request
}

const handleDuplicateFieldsDB = (err)=>{
    const value = Object.values(err.keyValue)[0]
    const message = `Duplicate field value: "${value}". Please use another value`
    return new AppError(message, 400)
}

const handleValidationErrorDB = (err)=>{
    const errors = Object.values(err.errors) // returns array of elements (objects)
    .map(el => { return el.message }) // returns a new array with the results of applying a function to each element.
    .join(". "); // joins all array elements in one stringseperated by ". "
    const message = `Invalid Input data: ${errors}`
    return new AppError(message, 400)
}

const handleTokenExpiredError = (err)=>{
    const message = "Token is expired, Please log in again."
    return new AppError(message, 401)
}

const handleJsonWebTokenError = (err)=>{
    return new AppError("Token is invalid, Please log in to continue.", 401)
}

module.exports = (err, req, res, next)=>{
    err.statusCode = err.statusCode || 500
    err.status = err.status || "fail"
    
    if(process.env.NODE_ENV === "development"){
        sendErrorDev(err, res);
    } else if(process.env.NODE_ENV === "production"){
        let error = {...err}
        if (err.name === "CastError"){ error = handleCastErrorDB(err) }
        if (err.code === 11000){ error = handleDuplicateFieldsDB(err) }
        if (err.name === "ValidationError"){ error = handleValidationErrorDB(err) }
        if (err.name === "JsonWebTokenError"){ error = handleJsonWebTokenError(err) }
        if (err.name === "TokenExpiredError"){ error = handleTokenExpiredError(err) }
        sendErrorProd(error, res); 
    }
    next()
}