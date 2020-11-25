const errors = require('./errors');
const model = require('./model');

exports.deleteSession = async (req, res, next) => {
  try {
    const result = await model.deleteSession(req.session, {...req.params});
    res.success(result);
  } catch (e) {
    next(e);
  }
};

exports.patchSession = async (req, res, next) => {
  try {
    const result = await model.refreshSession(req.session, {...req.body, ...req.params});
    res.success(result);
  } catch (e) {
    next(e);
  }
};

exports.postSessions = async (req, res, next) => {
  try {
    const result = await model.createSession({}, req.body);
    res.success(result);
  } catch (e) {
    next(e);
  }
};
