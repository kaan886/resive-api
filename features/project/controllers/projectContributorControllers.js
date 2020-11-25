const errors = require('../errors');
const model = require('../model/projectContributorModel');

exports.deleteContributor = async (req, res, next) => {
  try {
    const result = await model.removeContributor(req.session, {...req.body, ...req.params});
    res.success(result);
  } catch (e) {
    if (e instanceof errors.ProjectNotExistError) {
      res.status(400).error(e);
    } else {
      next(e);
    }
  }
};

exports.getContributors = async (req, res, next) => {
  try {
    const result = await model.getContributors(req.session, {projectId: req.params.projectId});
    res.success(result);
  } catch (e) {
    if (e instanceof errors.ProjectNotExistError) {
      res.status(400).error(e);
    } else {
      next(e);
    }
  }
};

exports.postContributors = async (req, res, next) => {
  try {
    const result = await model.addContributor(req.session, {...req.params, ...req.body});
    res.success(result);
  } catch (e) {
    if (e instanceof errors.ProjectNotExistError) {
      res.status(400).error(e);
    } else if (e instanceof errors.ProjectAlreadySharedError) {
      res.status(400).error(e);
    } else {
      next(e);
    }
  }
};

exports.patchContributorStatus = async (req, res, next) => {
  try {
    const result = await model.updateStatus(req.session, {...req.params, ...req.body});
    res.success(result);
  } catch (e) {
    if (e instanceof errors.ProjectNotExistError) {
      res.status(400).error(e);
    } else if (e instanceof errors.ProjectAlreadySharedError) {
      res.status(400).error(e);
    } else {
      next(e);
    }
  }
};
