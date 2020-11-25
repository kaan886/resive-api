const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const {CONTRIBUTOR_STATUS} = require('../project/enums');
const errors = require('./errors');
const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
const documentClient = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

/**
 * Changes password of session user.
 * @param session {object}
 * @param newPassword {string}
 * @param oldPassword {string}
 * @returns {Promise<boolean>}
 */
exports.changePassword = async (session, {newPassword, oldPassword}) => {
  const params = {
    AccessToken: session.accessToken,
    PreviousPassword: oldPassword,
    ProposedPassword: newPassword,
  };
  try {
    await cognitoIdentityServiceProvider.changePassword(params).promise();
  } catch (e) {
    if (e.code === 'NotAuthorizedException') {
      throw new errors.UserNotFoundError();
    }
    throw new UnknownError(e);
  }
};

/**
 * Confirms forgot password.
 * @param session {object}
 * @param confirmationCode {string}
 * @param password {string}
 * @param username {string}
 * @returns {Promise<boolean>}
 */
exports.confirmForgotPassword = async (session, {confirmationCode, password, username}) => {
  try {
    const params = {
      ClientId: process.env.AMAZON_COGNITO_CLIENT_ID,
      Username: username,
      Password: password,
      ConfirmationCode: confirmationCode,
    };
    await cognitoIdentityServiceProvider.confirmForgotPassword(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }
  return true;
};

/**
 * Confirms sign up with given confirmation code.
 * @param confirmationCode {string}
 * @param username {string}
 * @returns {Promise<boolean>}
 */
exports.confirmSignUp = async ({}, {confirmationCode, username}) => {
  try {
    await cognitoIdentityServiceProvider
      .confirmSignUp({
        ClientId: process.env.AMAZON_COGNITO_CLIENT_ID,
        ConfirmationCode: confirmationCode,
        Username: username,
      })
      .promise();
  } catch (e) {
    throw new UnknownError(e);
  }

  try {
    const {Items: invitations} = await documentClient
      .query({
        TableName: process.env.AWS_DYNAMODB_INVITATIONS_TABLE_NAME,
        KeyConditionExpression: '#username = :username',
        ExpressionAttributeNames: {
          '#username': 'username',
        },
        ExpressionAttributeValues: {
          ':username': username,
        },
      })
      .promise();
    if (invitations.length > 0) {
      // Gets user from identity service provider.
      const user = await cognitoIdentityServiceProvider
        .adminGetUser({UserPoolId: process.env.AMAZON_COGNITO_USER_POOL_ID, Username: username})
        .promise();
      const userId = user?.UserAttributes.find((attribute) => attribute.Name === 'sub').Value;
      // Processes all invitations for this user.
      for (const invitation of invitations) {
        // Gets project the user invited.
        const {Item: project} = await documentClient
          .get({
            TableName: process.env.AWS_DYNAMODB_PROJECTS_TABLE_NAME,
            Key: {projectId: invitation.projectId},
          })
          .promise();
        // Adds new contributor to the project.
        if (project) {
          await documentClient
            .update({
              TableName: process.env.AWS_DYNAMODB_PROJECTS_TABLE_NAME,
              Key: {projectId: invitation.projectId},
              UpdateExpression: 'set #projectContributors = list_append(#projectContributors, :projectContributors)',
              ExpressionAttributeNames: {
                '#projectContributors': 'projectContributors',
              },
              ExpressionAttributeValues: {
                ':projectContributors': [
                  {userId, profession: invitation.profession ?? '', status: CONTRIBUTOR_STATUS.PENDING},
                ],
              },
            })
            .promise();
        }
        // Removes invitation from db.
        await documentClient
          .delete({
            TableName: process.env.AWS_DYNAMODB_INVITATIONS_TABLE_NAME,
            Key: {projectId: invitation.projectId, username: invitation.username},
          })
          .promise();
      }
    }
  } catch (e) {
    throw new UnknownError(e);
  }
};

/**
 * Sends user an email with a confirmation code.
 * @param session {object}
 * @param username {string}
 * @returns {Promise<boolean>}
 */
exports.forgotPassword = async (session, {username}) => {
  try {
    const params = {
      ClientId: process.env.AMAZON_COGNITO_CLIENT_ID,
      Username: username,
    };
    await cognitoIdentityServiceProvider.forgotPassword(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }
  return true;
};

/**
 * Creates new user in identity service provider.
 * @param session {object}
 * @param username {string}
 * @param password {string}
 * @returns {Promise<boolean>}
 */
exports.signUp = async (session, {username, password}) => {
  try {
    await cognitoIdentityServiceProvider
      .signUp({
        ClientId: process.env.AMAZON_COGNITO_CLIENT_ID,
        Username: username,
        Password: password,
        UserAttributes: [{Name: 'email', Value: username}],
      })
      .promise();
    return true;
  } catch (e) {
    throw new UnknownError(e);
  }
};

/**
 * Resends confirmation code for sign-up process.
 * @param session {object}
 * @param username {string}
 * @returns {Promise<boolean>}
 */
exports.resendConfirmationCode = async (session, {username}) => {
  try {
    await cognitoIdentityServiceProvider
      .resendConfirmationCode({
        ClientId: process.env.AMAZON_COGNITO_CLIENT_ID,
        Username: username,
      })
      .promise();
    return true;
  } catch (e) {
    throw new UnknownError(e);
  }
};

/**
 * Gets personal settings of session user.
 * @param session {object}
 * @returns {Promise<{userName: *}>}
 */
exports.getSettings = async (session) => {
  return {
    userName: session['custom:userName'],
  };
};

/**
 * Sets personal settings of session user.
 * @param session {object}
 * @param settings {object}
 * @returns {Promise<boolean>}
 */
exports.setSettings = async (session, settings) => {
  const params = {
    AccessToken: session.accessToken,
    UserAttributes: Object.entries(settings).map(([key, value]) => ({Name: `custom:${key}`, Value: value})),
  };
  try {
    await cognitoIdentityServiceProvider.updateUserAttributes(params).promise();
    return true;
  } catch (e) {
    throw new UnknownError(e);
  }
};

exports.getUserAvatar = async (session, {userId}) => {
  try {
    const params = {
      Bucket: process.env.AWS_S3_AVATARS_BUCKET,
      Key: `${userId}`,
    };
    await s3.headObject(params).promise();
    return s3.getObject(params).createReadStream();
  } catch (e) {
    if (e.code === 'NotFound') {
      return fs.createReadStream(path.join(__dirname, '../../assets/img/avatar.png'));
    }
    throw new UnknownError(e);
  }
};

exports.setUserAvatar = async (session, {file}) => {
  // creates file in storage
  try {
    const params = {
      Bucket: process.env.AWS_S3_AVATARS_BUCKET,
      Key: `${session.userId}`,
      Body: fs.createReadStream(file.path),
    };
    await s3.putObject(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }
};
