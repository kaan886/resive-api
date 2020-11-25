class NotAuthorizedError extends CustomError {
  constructor() {
    super({code: 'NotAuthorizedError', message: 'Not Authorized'});
    this.name = 'NotAuthorizedError';
  }
}

const authorize = (req, res, next) => {
  if (!req.session) {
    res.status(401).error(new NotAuthorizedError());
  } else {
    next();
  }
};

module.exports = authorize;
