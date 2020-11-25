class UserNotFoundError extends CustomError {
  constructor() {
    super({code: 'UserNotFoundError', message: 'User not found.'});
    this.name = 'UserNotFoundError';
  }
}

class UserNotAuthorizedError extends CustomError {
  constructor() {
    super({code: 'UserNotAuthorizedError', message: 'User not authorized.'});
    this.name = 'UserNotAuthorizedError';
  }
}

exports.UserNotAuthorizedError = UserNotAuthorizedError;
exports.UserNotFoundError = UserNotFoundError;
