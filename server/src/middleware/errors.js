export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function notFound(req, res) {
  res.status(404).json({ message: 'The requested resource was not found.' });
}

export function errorHandler(error, req, res, next) {
  console.error(error);
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(error.errors).map(item => item.message).join(' ') });
  }
  if (error.name === 'CastError') return res.status(400).json({ message: 'Invalid product identifier.' });
  if (error.code === 11000) return res.status(409).json({ message: 'A product with these details already exists.' });
  if (error.name === 'MulterError') return res.status(400).json({ message: error.message });
  res.status(error.status || 500).json({ message: error.status ? error.message : 'Something went wrong. Please try again.' });
}
