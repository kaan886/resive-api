const AWS = require('aws-sdk');
const uuid = require('uuid');
const errors = require('../errors');
const {checkProjectAccess, getUsers} = require('./commonModel');
const {CONTRIBUTOR_STATUS} = require('../enums');
const documentClient = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

exports.createProject = async (session, {projectName, projectDescription}) => {
  const projectId = uuid.v4();
  // creates db item
  const dynamoDBParams = {
    TableName: process.env.AWS_DYNAMODB_PROJECTS_TABLE_NAME,
    Item: {
      projectId,
      projectName,
      projectDescription,
      projectOwner: session.userId,
      projectContributors: [],
      projectContributorIds: [],
      projectCreateTime: new Date().toISOString(),
      projectIsDeleted: false,
    },
  };
  await documentClient.put(dynamoDBParams).promise();
  // creates folder
  const s3Params = {
    Bucket: process.env.AWS_S3_PROJECTS_BUCKET,
    Key: `${projectId}/`,
  };
  await s3.putObject(s3Params).promise();

  return dynamoDBParams.Item;
};

exports.deleteProject = async (session, {projectId}) => {
  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_PROJECTS_TABLE_NAME,
      Key: {projectId},
      UpdateExpression: 'set #projectIsDeleted = :projectIsDeleted',
      ConditionExpression: '#projectOwner = :projectOwner',
      ExpressionAttributeNames: {
        '#projectIsDeleted': 'projectIsDeleted',
        '#projectOwner': 'projectOwner',
      },
      ExpressionAttributeValues: {
        ':projectIsDeleted': true,
        ':projectOwner': session.userId,
      },
    };
    await documentClient.update(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }
  return true;
};

exports.getProject = async (session, {projectId}) => {
  const project = await checkProjectAccess(session.userId, projectId);

  let files;
  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILES_TABLE_NAME,
      FilterExpression: '#projectId = :projectId and #fileIsDeleted = :fileIsDeleted',
      ProjectionExpression: '#fileId, #fileName, #fileDescription, #fileTags, #fileActivities[0]',
      ExpressionAttributeNames: {
        '#fileActivities': 'fileActivities',
        '#fileDescription': 'fileDescription',
        '#fileIsDeleted': 'fileIsDeleted',
        '#fileId': 'fileId',
        '#fileName': 'fileName',
        '#fileTags': 'fileTags',
        '#projectId': 'projectId',
      },
      ExpressionAttributeValues: {
        ':fileIsDeleted': false,
        ':projectId': projectId,
      },
    };
    const result = await documentClient.scan(params).promise();
    files = result.Items;
  } catch (e) {
    throw new UnknownError(e);
  }

  const projectActivities = files
    .filter((file) => file.fileActivities?.length > 0)
    .flatMap((file) => ({fileId: file.fileId, fileName: file.fileName, projectId, ...file.fileActivities[0]}));

  const projectContributors = project.projectContributors.filter(
    (contributor) => contributor.status !== CONTRIBUTOR_STATUS.REMOVED,
  );

  const userIds = [...projectActivities, ...projectContributors].map(({userId}) => userId);
  const users = await getUsers(userIds);

  projectActivities.forEach((activity) => {
    const user = users.find((user) => user.userId === activity.userId);
    Object.assign(activity, user);
  });

  projectContributors.forEach((contributor) => {
    const user = users.find((user) => user.userId === contributor.userId);
    Object.assign(contributor, user);
  });

  return {
    ...project,
    projectActivities,
    projectContributors,
    projectFiles: files.map((file) => ({...file, fileActivities: undefined})),
  };
};

exports.getProjects = async (session, {projectType}) => {
  const params = {
    TableName: process.env.AWS_DYNAMODB_PROJECTS_TABLE_NAME,
  };
  if (projectType === 'assigned') {
    Object.assign(params, {
      FilterExpression:
        'contains(#projectContributorIds, :projectContributorId) and #projectIsDeleted = :projectIsDeleted',
      ExpressionAttributeNames: {
        '#projectContributorIds': 'projectContributorIds',
        '#projectIsDeleted': 'projectIsDeleted',
      },
      ExpressionAttributeValues: {
        ':projectContributorId': session.userId,
        ':projectIsDeleted': false,
      },
    });
  } else {
    Object.assign(params, {
      FilterExpression: '#projectOwner = :projectOwner and #projectIsDeleted = :projectIsDeleted',
      ExpressionAttributeNames: {
        '#projectOwner': 'projectOwner',
        '#projectIsDeleted': 'projectIsDeleted',
      },
      ExpressionAttributeValues: {
        ':projectOwner': session.userId,
        ':projectIsDeleted': false,
      },
    });
  }

  let projects = [];

  try {
    const result = await documentClient.scan(params).promise();
    projects = result.Items;
    if (projectType === 'assigned') {
      projects.forEach((project) => {
        const contributor = project.projectContributors.find((contributor) => contributor.userId === session.userId);
        if (contributor.status === CONTRIBUTOR_STATUS.PENDING) {
          project.isPending = true;
        }
      });
    }
  } catch (e) {
    throw new UnknownError(e);
  }

  return projects
    .map((project) => ({
      projectId: project.projectId,
      projectName: project.projectName,
      projectDescription: project.projectDescription,
      projectCreateTime: project.projectCreateTime,
      isPending: project.isPending,
    }))
    .sort((a, b) => (a.projectCreateTime > b.projectCreateTime ? -1 : 1));
};

exports.updateProject = async (session, {projectId, changes}) => {
  const params = {
    TableName: process.env.AWS_DYNAMODB_PROJECTS_TABLE_NAME,
    Key: {projectId},
    UpdateExpression: 'set',
    ConditionExpression: '#projectOwner = :projectOwner',
    ExpressionAttributeNames: {
      '#projectOwner': 'projectOwner',
    },
    ExpressionAttributeValues: {
      ':projectOwner': session.userId,
    },
    ReturnValues: 'UPDATED_NEW',
  };
  Object.entries(changes).forEach(([key, value], index) => {
    params.ExpressionAttributeNames[`#${key}`] = key;
    params.ExpressionAttributeValues[`:${key}`] = value;
    params.UpdateExpression += `${index > 0 ? ',' : ''} #${key} = :${key}`;
  });
  const {Attributes} = await documentClient.update(params).promise();
  return Attributes;
};
