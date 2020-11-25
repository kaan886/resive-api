class NotFoundError extends CustomError {
  constructor() {
    super({code: 'NotFoundError', message: 'Not Found'});
    this.name = 'NotFoundError';
  }
}

const handleNotFound = (req, res) => {
  res.status(404).error(new NotFoundError());
};

module.exports = handleNotFound;
