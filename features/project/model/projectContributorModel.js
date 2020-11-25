const AWS = require('aws-sdk');
const errors = require('../errors');
const {checkProjectAccess, getUsers} = require('./commonModel');
const {CONTRIBUTOR_STATUS} = require('../enums');
const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
const documentClient = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES({apiVersion: '2010-12-01'});

exports.addContributor = async (session, {projectId, username, profession}) => {
  // user cannot add himself as contributor
  if (session.username === username) {
    throw new errors.ProjectContributorIsOwnerError();
  }

  const project = await checkProjectAccess(session.userId, projectId);

  // gets id of user by using username
  let userId;
  try {
    const params = {UserPoolId: process.env.AMAZON_COGNITO_USER_POOL_ID, Username: username};
    const user = await cognitoIdentityServiceProvider.adminGetUser(params).promise();
    userId = user?.UserAttributes.find((attribute) => attribute.Name === 'sub').Value;
  } catch (e) {
    if (e.code !== 'UserNotFoundException') {
      throw new UnknownError(e);
    }
  }

  if (!userId) {
    // Adds a new invitation record to db.
    try {
      const params = {
        TableName: process.env.AWS_DYNAMODB_INVITATIONS_TABLE_NAME,
        Item: {projectId, username, profession},
      };
      await documentClient.put(params).promise();
    } catch (e) {
      throw new UnknownError(e);
    }

    try {
      const params = {
        Destination: {
          ToAddresses: [username],
        },
        Message: {
          Body: {
            Html: {
              Charset: 'UTF-8',
              Data: `<h1>Invitation</h1><p>To project ${project.projectName}</p><a href="${process.env.WEB_APP_URL}auth/sign-up">Sign Up</a>`,
            },
          },
          Subject: {
            Charset: 'UTF-8',
            Data: 'Subject',
          },
        },
        Source: 'accounts@getrevise.com',
      };
      await ses.sendEmail(params).promise();
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  }

  // user cannot be a contributor if he is already an active contributor
  const contributor = project.projectContributors.find((contributor) => contributor.userId === userId);
  if (contributor?.status === CONTRIBUTOR_STATUS.ACTIVE || contributor?.status === CONTRIBUTOR_STATUS.PENDING) {
    throw new errors.ProjectUserAlreadyContributorError();
  }

  // updates db
  try {
    let newContributor;
    const params = {
      TableName: process.env.AWS_DYNAMODB_PROJECTS_TABLE_NAME,
      Key: {projectId},
      ExpressionAttributeNames: {
        '#projectContributors': 'projectContributors',
        '#projectContributorIds': 'projectContributorIds',
      },
    };
    if (contributor) {
      newContributor = {...contributor, profession, status: CONTRIBUTOR_STATUS.PENDING};
      // makes user active again if he was a contributor before
      params.UpdateExpression =
        'set #projectContributors = :projectContributors, #projectContributorIds = list_append(#projectContributorIds, :projectContributorIds)';
      params.ExpressionAttributeValues = {
        ':projectContributors': project.projectContributors.map((contributor) =>
          contributor.userId === userId ? newContributor : contributor,
        ),
        ':projectContributorIds': [userId],
      };
    } else {
      newContributor = {userId, profession, status: CONTRIBUTOR_STATUS.PENDING};
      // creates new contributor object if user was not a contributor before
      params.UpdateExpression =
        'set #projectContributors = list_append(#projectContributors, :projectContributors), #projectContributorIds = list_append(#projectContributorIds, :projectContributorIds)';
      params.ExpressionAttributeValues = {
        ':projectContributors': [newContributor],
        ':projectContributorIds': [userId],
      };
    }
    await documentClient.update(params).promise();
    return {...newContributor, ...(await getUsers([newContributor.userId]))[0]};
  } catch (e) {
    throw new UnknownError(e);
  }
};

exports.getContributors = async (session, {projectId}) => {
  const project = await checkProjectAccess(session.userId, projectId);
  const contributors = project.projectContributors.filter(({status}) => status !== CONTRIBUTOR_STATUS.REMOVED);

  // gets details of contributors
  for (const contributor of contributors) {
    try {
      const params = {
        UserPoolId: process.env.AMAZON_COGNITO_USER_POOL_ID,
        Filter: `sub = "${contributor.userId}"`,
        Limit: 1,
      };
      const result = await cognitoIdentityServiceProvider.listUsers(params).promise();
      const user = result.Users[0];
      contributor.userName = user.Attributes.find((attribute) => attribute.Name === 'custom:userName')?.Value ?? '';
      contributor.userEmail = user.Username;
    } catch (e) {
      // does nothing on error
    }
  }

  return contributors;
};

exports.removeContributor = async (session, {projectId, userId}) => {
  const project = await checkProjectAccess(session.userId, projectId);

  // checks if user is a contributor
  if (!project.projectContributors.some((contributor) => contributor.userId === userId)) {
    throw new errors.ProjectUserNotContributorError();
  }

  // updates db
  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_PROJECTS_TABLE_NAME,
      Key: {projectId},
      UpdateExpression:
        'set #projectContributors = :projectContributors set #projectContributorIds = :projectContributorIds',
      ExpressionAttributeNames: {
        '#projectContributors': 'projectContributors',
        '#projectContributorsIds': 'projectContributorsIds',
      },
      ExpressionAttributeValues: {
        ':projectContributors': project.projectContributors.map((contributor) =>
          contributor.userId === userId ? {...contributor, status: CONTRIBUTOR_STATUS.REMOVED} : contributor,
        ),
        ':projectContributorIds': project.projectContributorIds.filter((id) => id !== userId),
      },
    };
    await documentClient.update(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }

  return true;
};

exports.updateStatus = async (session, {projectId, userId, status}) => {
  const project = await checkProjectAccess(session.userId, projectId);

  // checks if user is a contributor
  if (!project.projectContributors.some((contributor) => contributor.userId === userId)) {
    throw new errors.ProjectUserNotContributorError();
  }

  // updates db
  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_PROJECTS_TABLE_NAME,
      Key: {projectId},
    };
    if (status === CONTRIBUTOR_STATUS.ACTIVE) {
      Object.assign(params, {
        UpdateExpression: 'set #projectContributors = :projectContributors',
        ExpressionAttributeNames: {
          '#projectContributors': 'projectContributors',
        },
        ExpressionAttributeValues: {
          ':projectContributors': project.projectContributors.map((contributor) =>
            contributor.userId === userId ? {...contributor, status} : contributor,
          ),
        },
      });
    } else {
      Object.assign(params, {
        UpdateExpression:
          'set #projectContributors = :projectContributors, #projectContributorIds = :projectContributorIds',
        ExpressionAttributeNames: {
          '#projectContributors': 'projectContributors',
          '#projectContributorIds': 'projectContributorIds',
        },
        ExpressionAttributeValues: {
          ':projectContributors': project.projectContributors.map((contributor) =>
            contributor.userId === userId ? {...contributor, status} : contributor,
          ),
          ':projectContributorIds': project.projectContributorIds.filter((id) => id !== userId),
        },
      });
    }
    await documentClient.update(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }

  return true;
};
