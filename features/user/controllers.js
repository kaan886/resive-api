const fs = require('fs');
const errors = require('./errors');
const model = require('./model');

exports.postUsers = async (req, res, next) => {
  try {
    const result = await model.signUp({}, req.body);
    res.success(result);
  } catch (e) {
    next(e);
  }
};

exports.patchUserConfirmationCode = async (req, res, next) => {
  try {
    const result = await model.resendConfirmationCode({}, {...req.params});
    res.success(result);
  } catch (e) {
    next(e);
  }
};

exports.putUserConfirmationCode = async (req, res, next) => {
  try {
    const result = await model.confirmSignUp({}, {...req.body, ...req.params});
    res.success(result);
  } catch (e) {
    next(e);
  }
};

exports.patchUserPassword = async (req, res, next) => {
  try {
    const result = await model.changePassword(req.session, {...req.body, ...req.params});
    res.success(result);
  } catch (e) {
    if (e instanceof errors.UserNotFoundError) {
      res.status(400).error(e);
    }
    next(e);
  }
};

exports.getUserAvatar = async (req, res, next) => {
  try {
    const result = await model.getUserAvatar(req.session, {...req.params});
    result.pipe(res);
  } catch (e) {
    next(e);
  }
};

exports.putUserAvatar = async (req, res, next) => {
  try {
    const result = await model.setUserAvatar(req.session, {...req.params, file: req.file});
    res.success(result);
  } catch (e) {
    next(e);
  } finally {
    fs.unlinkSync(req.file.path);
  }
};

exports.getUserSettings = async (req, res, next) => {
  try {
    const settings = await model.getSettings(req.session);
    res.success(settings);
  } catch (e) {
    next(e);
  }
};

exports.putUserSettings = async (req, res, next) => {
  try {
    const result = await model.setSettings(req.session, {...req.body});
    res.success(result);
  } catch (e) {
    next(e);
  }
};

exports.putUserForgotPasswordRequest = async (req, res, next) => {
  try {
    const settings = await model.forgotPassword(req.session, {...req.params});
    res.success(settings);
  } catch (e) {
    next(e);
  }
};

exports.patchUserForgotPasswordRequest = async (req, res, next) => {
  try {
    const result = await model.confirmForgotPassword(req.session, {...req.body, ...req.params});
    res.success(result);
  } catch (e) {
    next(e);
  }
};
