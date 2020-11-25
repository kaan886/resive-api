class FileAlreadyExistsError extends CustomError {
  constructor() {
    super({code: 'FileAlreadyExistsError', message: 'File already exists.'});
    this.name = 'FileAlreadyExistsError';
  }
}

class FileAlreadyPulledError extends CustomError {
  constructor() {
    super({code: 'FileAlreadyPulledError', message: 'File is already pulled.'});
    this.name = 'FileAlreadyPulledError';
  }
}

class FileNotAuthorizedError extends CustomError {
  constructor() {
    super({code: 'FileNotAuthorizedError', message: 'You are not authorized.'});
    this.name = 'FileNotAuthorizedError';
  }
}

class FileNotExistsError extends CustomError {
  constructor() {
    super({code: 'FileNotExistsError', message: 'File does not exist.'});
    this.name = 'FileNotExistsError';
  }
}

class FileNotLatestError extends CustomError {
  constructor() {
    super({code: 'FileNotLatestError', message: 'File is updated after pulled.'});
    this.name = 'FileNotLatestError';
  }
}

class FileNotPulledError extends CustomError {
  constructor() {
    super({code: 'FileNotPulledError', message: 'File has not been pulled yet.'});
    this.name = 'FileNotPulledError';
  }
}

class FileProjectNotAuthorizedError extends CustomError {
  constructor() {
    super({code: 'FileProjectNotAuthorizedError', message: 'You are not authorized.'});
    this.name = 'FileProjectNotAuthorizedError';
  }
}

class FileProjectNotExistError extends CustomError {
  constructor() {
    super({code: 'FileProjectNotExistError', message: 'Project does not exist.'});
    this.name = 'FileProjectNotExistError';
  }
}

exports.FileAlreadyExistsError = FileAlreadyExistsError;
exports.FileAlreadyPulledError = FileAlreadyPulledError;
exports.FileNotAuthorizedError = FileNotAuthorizedError;
exports.FileNotExistsError = FileNotExistsError;
exports.FileNotLatestError = FileNotLatestError;
exports.FileNotPulledError = FileNotPulledError;
exports.FileProjectNotAuthorizedError = FileProjectNotAuthorizedError;
exports.FileProjectNotExistError = FileProjectNotExistError;
