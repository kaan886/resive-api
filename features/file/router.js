const {Router} = require('express');
const upload = require('multer')({
  dest: process.env.UPLOAD_DIRECTORY_PATH,
  limits: {fieldSize: process.env.UPLOAD_FILE_SIZE},
});
const {FILE_ACTIVITY_ACTION} = require('./enums');
const controllers = require('./controllers');
const authorize = require('../../middlewares/authorize');
const validateSchema = require('../../middlewares/validateSchema');
const router = Router();

router.use(authorize);

router
  .route('/')
  .get(controllers.getFiles)
  .post(
    upload.single('file'),
    validateSchema({
      properties: {fileName: {type: 'string'}, fileDescription: {type: 'string'}, fileTags: {type: 'string'}},
      required: ['fileName', 'fileDescription'],
    }),
    controllers.postFiles,
  );

router
  .route('/:fileId')
  .get(controllers.getFile)
  .delete(controllers.deleteFile)
  .patch(
    validateSchema({
      properties: {fileName: {type: 'string'}, fileDescription: {type: 'string'}, fileTags: {type: 'array'}},
      required: ['fileName', 'fileDescription'],
    }),
    controllers.patchFile,
  );

router.route('/:fileId/activities').post(
  upload.single('file'),
  validateSchema({
    properties: {
      action: {enum: Object.values(FILE_ACTIVITY_ACTION)},
      activityDescription: {type: 'string'},
    },
    required: ['action', 'activityDescription'],
    if: {properties: {action: {const: 'pull'}}},
    then: {properties: {estimatedPushTime: {format: 'date'}}, required: ['estimatedPushTime']},
  }),
  controllers.postFileActivities,
);

router.route('/:fileId/content').get(controllers.getFileContent);

router
  .route('/:fileId/versions/:version/keep')
  .put(validateSchema({properties: {keep: {type: 'boolean'}}, required: ['keep']}), controllers.putFileVersionKeep);

module.exports = router;
