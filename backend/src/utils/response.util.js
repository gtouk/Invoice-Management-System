export function successResponse(res, message, data = null, statusCode = 200, meta = null) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {})
  });
}

export function errorResponse(res, message, statusCode = 500, errors = []) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
}
