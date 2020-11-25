class InternalServerError extends CustomError {
  constructor(props) {
    super({message: 'Internal Server Error', ...props, code: 'InternalServerError'});
    this.name = 'InternalServerError';
  }
}

const handleInternalServerError = (err, req, res, next) => {
  console.error(err);
  res.status(500).error(new InternalServerError({message: err.message}));
};

module.exports = handleInternalServerError;
