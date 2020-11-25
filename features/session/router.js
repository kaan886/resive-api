const {Router} = require('express');
const controllers = require('./controllers');
const authorize = require('../../middlewares/authorize');
const validateSchema = require('../../middlewares/validateSchema');
const router = Router();

router.route('/').post(
  validateSchema({
    properties: {username: {type: 'string'}, password: {type: 'string'}},
    required: ['username', 'password'],
  }),
  controllers.postSessions,
);

router
  .route('/:sessionId')
  .patch(
    authorize,
    validateSchema({properties: {refreshToken: {type: 'string'}}, required: ['refreshToken']}),
    controllers.patchSession,
  )
  .delete(authorize, controllers.deleteSession);

module.exports = router;
