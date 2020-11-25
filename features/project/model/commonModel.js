const AWS = require('aws-sdk');
const errors = require('../errors');
const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
const documentClient = new AWS.DynamoDB.DocumentClient();

exports.checkProjectAccess = checkProjectAccess;
exports.decorateActivities = decorateActivities;
exports.getUsers = getUsers;

/**
 * A helper method that checks if a user has access grant to a project.
 * @param userId {string}
 * @param projectId {string}
 * @returns {Promise<object>}
 */
async function checkProjectAccess(userId, projectId) {
  const params = {
    TableName: process.env.AWS_DYNAMODB_PROJECTS_TABLE_NAME,
    Key: {projectId},
  };
  const {Item: project} = await documentClient.get(params).promise();
  if (!project) {
    throw new errors.ProjectNotExistError();
  }
  if (
    project.projectOwner !== userId &&
    !project.projectContributors.some((contributor) => contributor.userId === userId)
  ) {
    throw new errors.ProjectNotAuthorizedError();
  }
  return project;
}

/**
 * Adds user info to activity objects.
 * @param activities {[object]}
 * @param contributors {[object]}
 * @returns {Promise<[object]>}
 */
async function decorateActivities(activities, contributors = []) {
  const userIds = activities.map((activity) => activity.userId);
  const users = await getUsers(userIds);
  activities.forEach((activity) => {
    const user = users.find((user) => user.userId === activity.userId);
    const contributor = contributors.find((contributor) => contributor.userId === activity.userId);
    Object.assign(activity, user, {userProfession: contributor?.profession ?? ''});
  });
  return activities;
}

/**
 * A helper method that gets user data by given ids.
 * @param userIds {[string]}
 * @returns {Promise<[object]>}
 */
async function getUsers(userIds) {
  const users = [];
  for (const userId of userIds) {
    try {
      const params = {
        UserPoolId: process.env.AMAZON_COGNITO_USER_POOL_ID,
        Filter: `sub = "${userId}"`,
        Limit: 1,
      };
      const result = await cognitoIdentityServiceProvider.listUsers(params).promise();
      const user = result.Users[0];
      users.push({
        userName: user.Attributes.find((attribute) => attribute.Name === 'custom:userName')?.Value ?? '',
        userEmail: user.Username,
        userId,
      });
    } catch (e) {
      users.push({
        userName: '',
        userEmail: '',
        userId,
      });
    }
  }
  return users;
}
