const AWS = require('aws-sdk');
const errors = require('./errors');
const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

/**
 * Creates a session for user. Login.
 * @param username {string}
 * @param password {string}
 * @returns {Promise<object>}
 */
exports.createSession = async ({}, {username, password}) => {
  const params = {
    AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
    ClientId: process.env.AMAZON_COGNITO_CLIENT_ID,
    UserPoolId: process.env.AMAZON_COGNITO_USER_POOL_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  };
  try {
    const {AuthenticationResult} = await cognitoIdentityServiceProvider.adminInitiateAuth(params).promise();
    return {
      accessToken: AuthenticationResult.AccessToken,
      idToken: AuthenticationResult.IdToken,
      expiresIn: AuthenticationResult.ExpiresIn,
      refreshToken: AuthenticationResult.RefreshToken,
      tokenType: AuthenticationResult.TokenType,
    };
  } catch (e) {
    if (e.code === 'NotAuthorizedException') {
      throw new errors.SessionUserNotFoundError();
    }
    throw new UnknownError(e);
  }
};

/**
 * Deletes session. Logout.
 * @param session {object}
 * @param sessionId {string}
 * @returns {Promise<object>}
 */
exports.deleteSession = async (session, {sessionId}) => {
  try {
    const params = {AccessToken: session.accessToken};
    await cognitoIdentityServiceProvider.globalSignOut(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }
  return true;
};

/**
 * Refreshes session.
 * @param session {object}
 * @param refreshToken {string}
 * @returns {Promise<object>}
 */
exports.refreshSession = async (session, {refreshToken}) => {
  try {
    const params = {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: process.env.AMAZON_COGNITO_CLIENT_ID,
      UserPoolId: process.env.AMAZON_COGNITO_USER_POOL_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    };
    const {AuthenticationResult} = await cognitoIdentityServiceProvider.adminInitiateAuth(params).promise();
    return {
      accessToken: AuthenticationResult.AccessToken,
      idToken: AuthenticationResult.IdToken,
      expiresIn: AuthenticationResult.ExpiresIn,
      refreshToken: AuthenticationResult.RefreshToken ?? refreshToken,
      tokenType: AuthenticationResult.TokenType,
    };
  } catch (e) {
    throw new UnknownError(e);
  }
};
