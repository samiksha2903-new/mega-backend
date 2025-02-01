class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false
        this.errors = errors

        if(stack) {
            this.stack = stack
        } else  {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}


export { ApiError }

//  ApiError class is a custom error class in JavaScript, designed to extend the built-in Error class.
// By extending the Error class, ApiError inherits its functionality, such as stack trace generation and compatibility with try-catch blocks.

// If a stack is provided, it uses that as the stack trace. Otherwise, it generates a stack trace using Error.captureStackTrace, which points to the location where the error was instantiated.