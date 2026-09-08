// Central error handler - never leaks stack traces to the client.
function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error('[error]', err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);

  let status = err.status || 500;
  let message = err.message || 'Something went wrong. Please try again.';

  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }
  if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid ID format.';
  }
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `That ${field} is already in use.`;
  }

  res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
