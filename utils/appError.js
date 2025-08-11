class AppError extends Error{
    constructor(message, statusCode){
        super(message)
        this.statusCode = statusCode
        this.status = `${statusCode}`.startsWith("4") ? "fail": "error"
        this.isOperational = true
        Error.captureStackTrace(this, this.constructor) // i don't understand this
    }
}

module.exports = AppError