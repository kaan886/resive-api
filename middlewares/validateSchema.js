const ajv = require('ajv')({allErrors: true});

class ValidationError extends CustomError {
  constructor(errors) {
    super({code: 'ValidationError', data: errors, message: 'Validation Error.'});
    this.name = 'ValidationError';
  }
}

const validateSchema = (schema) => {
  const validate = ajv.compile(schema);

  return (req, res, next) => {
    const valid = validate(req.body);

    if (valid) {
      next();
    } else {
      res.status(422).error(new ValidationError(validate.errors));
    }
  };
};

module.exports = validateSchema;
