const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Mongoose validation error — e.g. required field missing
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', '),
    });
  }

  // Mongoose duplicate key — e.g. email already exists
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // Mongoose bad ObjectId — e.g. /users/not-a-valid-id
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  // Custom app errors (err.statusCode set manually in controllers)
  const statusCode =
    Number(err.statusCode) >= 100 && Number(err.statusCode) < 600
      ? err.statusCode
      : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // only expose stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;