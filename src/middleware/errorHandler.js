const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`, process.env.NODE_ENV === "development" ? err.stack : "");

  // Multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: `File too large. Max size is ${process.env.MAX_FILE_SIZE_MB || 5}MB` });
  }

  // Mongoose validation
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ error: messages.join(", ") });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ error: `${field} already exists` });
  }

  const status  = err.statusCode || err.status || 500;
  const message = err.message    || "Internal server error";
  res.status(status).json({ error: message });
};

module.exports = errorHandler;
