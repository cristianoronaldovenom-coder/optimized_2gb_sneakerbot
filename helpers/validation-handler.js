import { ValidationError } from 'express-validation';

const validationHandler = (err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(err.statusCode).json({
      success: false,
      message: 'Validation Failed',
      data: err.details
    });
  }

  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return res.status(status).json({ success: false, message, data: {} });
};

export default validationHandler;
