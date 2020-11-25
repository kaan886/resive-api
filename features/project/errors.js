class ProjectAlreadySharedError extends CustomError {
  constructor() {
    super({code: 'ProjectAlreadySharedError', message: 'Project already shared.'});
    this.name = 'ProjectAlreadySharedError';
  }
}

class ProjectContributorIsOwnerError extends CustomError {
  constructor() {
    super({code: 'ProjectContributorIsOwnerError', message: 'Owner cannot be a contributor.'});
    this.name = 'ProjectContributorIsOwnerError';
  }
}

class ProjectNotAuthorizedError extends CustomError {
  constructor() {
    super({code: 'ProjectNotAuthorizedError', message: 'You are not authorized.'});
    this.name = 'ProjectNotAuthorizedError';
  }
}

class ProjectNotExistError extends CustomError {
  constructor() {
    super({code: 'ProjectNotExistError', message: 'Project does not exist.'});
    this.name = 'ProjectNotExistError';
  }
}

class ProjectUserAlreadyContributorError extends CustomError {
  constructor() {
    super({code: 'ProjectUserAlreadyContributorError', message: 'User is already a contributor.'});
    this.name = 'ProjectUserAlreadyContributorError';
  }
}

class ProjectUserNotContributorError extends CustomError {
  constructor() {
    super({code: 'ProjectUserNotContributorError', message: 'User is not a contributor.'});
    this.name = 'ProjectUserNotContributorError';
  }
}

class ProjectUserNotExistError extends CustomError {
  constructor() {
    super({code: 'ProjectUserNotExistError', message: 'User does not exist.'});
    this.name = 'ProjectUserNotExistError';
  }
}

exports.ProjectAlreadySharedError = ProjectAlreadySharedError;
exports.ProjectContributorIsOwnerError = ProjectContributorIsOwnerError;
exports.ProjectNotAuthorizedError = ProjectNotAuthorizedError;
exports.ProjectNotExistError = ProjectNotExistError;
exports.ProjectUserAlreadyContributorError = ProjectUserAlreadyContributorError;
exports.ProjectUserNotContributorError = ProjectUserNotContributorError;
exports.ProjectUserNotExistError = ProjectUserNotExistError;

class ProjectFileAlreadyExistsError extends CustomError {
  constructor() {
    super({code: 'ProjectFileAlreadyExistsError', message: 'File already exists.'});
    this.name = 'ProjectFileAlreadyExistsError';
  }
}

class ProjectFileAlreadyPulledError extends CustomError {
  constructor() {
    super({code: 'ProjectFileAlreadyPulledError', message: 'File is already pulled.'});
    this.name = 'ProjectFileAlreadyPulledError';
  }
}

class ProjectFileNotAuthorizedError extends CustomError {
  constructor() {
    super({code: 'ProjectFileNotAuthorizedError', message: 'You are not authorized.'});
    this.name = 'ProjectFileNotAuthorizedError';
  }
}

class ProjectFileNotExistsError extends CustomError {
  constructor() {
    super({code: 'ProjectFileNotExistsError', message: 'File does not exist.'});
    this.name = 'ProjectFileNotExistsError';
  }
}

class ProjectFileNotLatestError extends CustomError {
  constructor() {
    super({code: 'ProjectFileNotLatestError', message: 'File is updated after pulled.'});
    this.name = 'ProjectFileNotLatestError';
  }
}

class ProjectFileNotPulledError extends CustomError {
  constructor() {
    super({code: 'ProjectFileNotPulledError', message: 'File has not been pulled yet.'});
    this.name = 'ProjectFileNotPulledError';
  }
}

exports.ProjectFileAlreadyExistsError = ProjectFileAlreadyExistsError;
exports.ProjectFileAlreadyPulledError = ProjectFileAlreadyPulledError;
exports.ProjectFileNotAuthorizedError = ProjectFileNotAuthorizedError;
exports.ProjectFileNotExistsError = ProjectFileNotExistsError;
exports.ProjectFileNotLatestError = ProjectFileNotLatestError;
exports.ProjectFileNotPulledError = ProjectFileNotPulledError;

class FileVersionNotExistError extends CustomError {
  constructor() {
    super({code: 'FileVersionNotExistError', message: 'File version does not exist.'});
    this.name = 'FileVersionNotExistError';
  }
}

exports.FileVersionNotExistError = FileVersionNotExistError;
