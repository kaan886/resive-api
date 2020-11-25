const errors = require('../errors');
const model = require('../model/projectModel');

exports.deleteProject = async (req, res, next) => {
  try {
    const result = await model.deleteProject(req.session, req.params);
    res.success(result);
  } catch (e) {
    if (e instanceof errors.ProjectNotExistError) {
      res.status(400).error(e);
    } else {
      next(e);
    }
  }
};

exports.getProject = async (req, res, next) => {
  try {
    const result = await model.getProject(req.session, req.params);
    res.success(result);
  } catch (e) {
    next(e);
  }
};

exports.getProjects = async (req, res, next) => {
  try {
    const result = await model.getProjects(req.session, {...req.query});
    res.success(result);
  } catch (e) {
    next(e);
  }
};

exports.patchProject = async (req, res, next) => {
  try {
    const result = await model.updateProject(req.session, {...req.params, changes: req.body});
    res.success(result);
  } catch (e) {
    if (e instanceof errors.ProjectNotExistError) {
      res.status(400).error(e);
    } else {
      next(e);
    }
  }
};

exports.postProjects = async (req, res, next) => {
  try {
    const result = await model.createProject(req.session, req.body);
    res.success(result);
  } catch (e) {
    next(e);
  }
};
