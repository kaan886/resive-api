const {Router} = require('express');
const upload = require('multer')({dest: process.env.UPLOAD_DIRECTORY_PATH});
const controllers = require('./controllers');
const authorize = require('../../middlewares/authorize');
const validateSchema = require('../../middlewares/validateSchema');
const router = Router();

router.route('/').post(
  validateSchema({
    properties: {username: {type: 'string'}, password: {type: 'string'}},
    required: ['username', 'password'],
  }),
  controllers.postUsers,
);

router.route('/:username/confirmation-code').patch(controllers.patchUserConfirmationCode);

router
  .route('/:username/confirmation-code')
  .put(
    validateSchema({properties: {confirmationCode: {type: 'string'}}, required: ['confirmationCode']}),
    controllers.putUserConfirmationCode,
  );

router
  .route('/:userId/avatar')
  .get(controllers.getUserAvatar)
  .put(authorize, upload.single('file'), controllers.putUserAvatar);

router
  .route('/:userId/settings')
  .get(authorize, controllers.getUserSettings)
  .put(
    authorize,
    validateSchema({
      properties: {userName: {type: 'string'}},
      required: ['userName'],
    }),
    controllers.putUserSettings,
  );

router.route('/:userId/password').patch(
  authorize,
  validateSchema({
    properties: {oldPassword: {type: 'string'}, newPassword: {type: 'string'}},
    required: ['oldPassword', 'newPassword'],
  }),
  controllers.patchUserPassword,
);

router
  .route('/:username/forgot-password-request')
  .put(controllers.putUserForgotPasswordRequest)
  .patch(
    validateSchema({properties: {confirmationCode: {type: 'string'}}, required: ['confirmationCode']}),
    controllers.patchUserForgotPasswordRequest,
  );

module.exports = router;
