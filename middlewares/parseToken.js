const AWS = require('aws-sdk');
const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

const parseToken = async (req, res, next) => {
  const token = req.get('Authorization')?.split(' ')?.[1];
  if (token) {
    try {
      const params = {AccessToken: token};
      const user = await cognitoIdentityServiceProvider.getUser(params).promise();
      req.session = {
        accessToken: token,
        username: user.Username,
      };
      user.UserAttributes.forEach((attribute) => {
        req.session[attribute.Name] = attribute.Value;
      });
      req.session.userId = req.session.sub;
      next();
    } catch (e) {
      next();
    }
  } else {
    next();
  }
};

module.exports = parseToken;
