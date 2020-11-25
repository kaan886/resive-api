const fs = require('fs');
const errors = require('./errors');
const model = require('./model');

exports.deleteFile = async (req, res, next) => {
  try {
    const result = await model.deleteFile(req.session, {...req.params, ...req.query});
    res.success(result);
  } catch (e) {
    next(e);
  }
};

exports.getFile = async (req, res, next) => {
  try {
    const result = await model.getFile(req.session, {...req.params, ...req.query});
    res.success(result);
  } catch (e) {
    next(e);
  }
};

exports.getFileContent = async (req, res, next) => {
  try {
    const result = await model.getFileContent(req.session, {...req.params, ...req.query});
    result.pipe(res);
  } catch (e) {
    next(e);
  }
};

exports.getFiles = async (req, res, next) => {
  try {
    const result = await model.getFiles(req.session, {...req.query});
    res.success(result);
  } catch (e) {
    next(e);
  }
};

exports.patchFile = async (req, res, next) => {
  try {
    const result = await model.updateFile(req.session, {...req.body, ...req.params, ...req.query});
    res.success(result);
  } catch (e) {
    next(e);
  }
};

exports.postFileActivities = async (req, res, next) => {
  try {
    const result = await model.createActivity(req.session, {
      ...req.body,
      ...req.params,
      ...req.query,
      upload: req.file,
    });
    res.success(result);
  } catch (e) {
    next(e);
  } finally {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
  }
};

exports.postFiles = async (req, res, next) => {
  try {
    const result = await model.createFile(req.session, {...req.body, upload: req.file});
    res.success(result);
  } catch (e) {
    next(e);
  } finally {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
  }
};

exports.putFileVersionKeep = async (req, res, next) => {
  try {
    const result = await model.setVersionKeep(req.session, {...req.body, ...req.params, ...req.query});
    res.success(result);
  } catch (e) {
    next(e);
  }
};
