const {Router} = require('express');
const controllers = require('./controllers');
const upload = require('multer')({
  dest: process.env.UPLOAD_DIRECTORY_PATH,
  limits: {fieldSize: process.env.UPLOAD_FILE_SIZE},
});
const authorize = require('../../middlewares/authorize');
const validateSchema = require('../../middlewares/validateSchema');
const router = Router();

router.use(authorize);

router
  .route('/')
  .get(controllers.project.getProjects)
  .post(
    authorize,
    validateSchema({
      properties: {projectName: {type: 'string'}, projectDescription: {type: 'string'}},
      required: ['projectName'],
    }),
    controllers.project.postProjects,
  );

router
  .route('/:projectId')
  .delete(controllers.project.deleteProject)
  .get(controllers.project.getProject)
  .patch(controllers.project.patchProject);

router
  .route('/:projectId/contributors')
  .get(controllers.projectContributor.getContributors)
  .post(
    validateSchema({
      properties: {username: {type: 'string'}, profession: {type: 'string'}},
      required: ['username', 'profession'],
    }),
    controllers.projectContributor.postContributors,
  );

router.route('/:projectId/contributors/:userId').delete(controllers.projectContributor.deleteContributor);

router
  .route('/:projectId/contributors/:userId/status')
  .patch(
    validateSchema({properties: {status: {type: 'string'}}, required: ['status']}),
    controllers.projectContributor.patchContributorStatus,
  );

module.exports = router;
