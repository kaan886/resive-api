class UnknownError extends CustomError {
  constructor(props = {}) {
    super({message: 'Oops! Something went wrong.', ...props, code: 'UnknownError'});
    this.name = 'UnknownError';
  }
}

module.exports = UnknownError;
