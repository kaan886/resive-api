class SessionUserNotFoundError extends CustomError {
  constructor() {
    super({code: 'SessionUserNotFoundError', message: 'User not found.'});
    this.name = 'SessionUserNotFoundError';
  }
}

exports.SessionUserNotFoundError = SessionUserNotFoundError;
