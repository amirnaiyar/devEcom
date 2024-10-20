// Custom Error Handler Middleware
const errorHandler = (err, req, res, next) => {
    console.error(err); // Log error for debugging

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const errorCode = err.code || 'SERVER_ERROR';
    
    res.status(statusCode).json({
        status: 'error',
        message,
        error: {
            code: errorCode,
            details: err.details || 'An unexpected error occurred'
        }
    });
};

module.exports = {
    errorHandler
}