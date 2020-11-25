const fs = require('fs');
const AWS = require('aws-sdk');
const uuid = require('uuid');
const {FILE_ACTIVITY_ACTION, FILE_ACTIVITY_STATUS} = require('./enums');
const errors = require('./errors');
const {decorateActivities} = require('../project/model/commonModel');
const documentClient = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

exports.createActivity = async (
  session,
  {projectId, fileId, activityDescription, estimatedPushTime, action, upload},
) => {
  const {projectContributors} = await checkProjectAccess(session.userId, projectId);

  let file;

  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILES_TABLE_NAME,
      ProjectionExpression: '#fileId, #fileActivities[0], #fileVersion, #projectId',
      Key: {fileId, projectId},
      ExpressionAttributeNames: {
        '#fileActivities': 'fileActivities',
        '#fileId': 'fileId',
        '#fileVersion': 'fileVersion',
        '#projectId': 'projectId',
      },
    };
    const result = await documentClient.get(params).promise();
    file = result.Item;
  } catch (e) {
    throw new UnknownError(e);
  }

  // Checks file existence.
  if (!file) {
    throw new errors.FileNotExistsError();
  }

  let newActivity;
  switch (action) {
    case FILE_ACTIVITY_ACTION.CANCEL:
      newActivity = await createActivityCancel(session.userId, file, activityDescription);
      break;
    case FILE_ACTIVITY_ACTION.PULL:
      newActivity = await createActivityPull(session.userId, file, activityDescription, estimatedPushTime);
      break;
    case FILE_ACTIVITY_ACTION.PUSH:
      newActivity = await createActivityPush(session.userId, file, activityDescription, upload);
      break;
    default:
      return null;
  }

  return (await decorateActivities([newActivity], projectContributors))[0];
};

exports.createFile = async (session, {fileName, fileDescription, fileTags, projectId, upload}) => {
  await checkProjectAccess(session.userId, projectId, 'owner');

  // User cannot create files with same name. Checks this condition.
  let existingFile;

  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILES_TABLE_NAME,
      ProjectionExpression: '#fileId',
      FilterExpression: '#projectId = :projectId and #fileName = :fileName',
      ExpressionAttributeNames: {
        '#fileId': 'fileId',
        '#fileName': 'fileName',
        '#projectId': 'projectId',
      },
      ExpressionAttributeValues: {
        ':fileName': fileName,
        ':projectId': projectId,
      },
    };
    const result = await documentClient.scan(params).promise();
    existingFile = result.Items[0];
  } catch (e) {
    throw new UnknownError(e);
  }

  if (existingFile) {
    throw new errors.FileAlreadyExistsError();
  }

  // Creates an id for the file.
  const fileId = uuid.v4();

  // Creates file in storage.
  try {
    const params = {
      Bucket: process.env.AWS_S3_PROJECTS_BUCKET,
      Key: generateS3BucketObjectKey(projectId, fileId, 1),
      Body: fs.createReadStream(upload.path),
    };
    await s3.putObject(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }

  // Creates record in DB.
  const time = new Date().toISOString();
  const file = {
    fileActivities: [],
    fileCreateTime: time,
    fileDescription,
    fileId,
    fileIsDeleted: false,
    fileMimeType: upload.mimetype,
    fileName,
    fileTags: typeof fileTags === 'string' ? fileTags.split(',').filter((tag) => !!tag) : fileTags,
    fileVersion: 1,
    fileUpdateTime: null,
    projectId,
  };
  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILES_TABLE_NAME,
      Item: file,
    };
    await documentClient.put(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }

  // Creates a DB record for new version.
  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILE_VERSIONS_TABLE_NAME,
      Item: {
        createTime: file.fileCreateTime,
        deleted: false,
        fileId,
        keep: false,
        projectId,
        userId: session.userId,
        versionNumber: 1,
      },
    };
    await documentClient.put(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }

  // Returns created file.
  return file;
};

exports.deleteFile = async (session, {fileId, projectId}) => {
  await checkProjectAccess(session.userId, projectId, 'owner');

  // Checks file existence.
  let file;

  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILES_TABLE_NAME,
      Key: {fileId, projectId},
    };
    const result = await documentClient.get(params).promise();
    file = result.Item;
  } catch (e) {
    throw new UnknownError(e);
  }

  if (file == null) {
    throw new errors.FileNotExistsError();
  }

  // Deletes file from storage.
  try {
    const params = {
      Bucket: process.env.AWS_S3_PROJECTS_BUCKET,
      Key: generateS3BucketObjectKey(projectId, fileId),
    };
    await s3.deleteObject(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }

  // Deletes file from DB.
  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILES_TABLE_NAME,
      Key: {fileId, projectId},
      UpdateExpression: `set #fileIsDeleted = :fileIsDeleted`,
      ExpressionAttributeNames: {
        '#fileIsDeleted': 'fileIsDeleted',
      },
      ExpressionAttributeValues: {
        ':fileIsDeleted': true,
      },
    };
    await documentClient.update(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }

  return true;
};

exports.getFile = async (session, {projectId, fileId}) => {
  const {projectContributors, projectOwner} = await checkProjectAccess(session.userId, projectId);

  let file;

  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILES_TABLE_NAME,
      Key: {fileId, projectId},
    };
    const result = await documentClient.get(params).promise();
    file = result.Item;
  } catch (e) {
    throw new UnknownError(e);
  }

  if (!file) {
    throw new errors.FileNotExistsError();
  }

  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILE_VERSIONS_TABLE_NAME,
      KeyConditionExpression: '#fileId = :fileId',
      ExpressionAttributeNames: {
        '#fileId': 'fileId',
      },
      ExpressionAttributeValues: {
        ':fileId': fileId,
      },
    };
    const result = await documentClient.query(params).promise();
    file.fileVersions = result.Items;
  } catch (e) {
    console.error(e);
  }

  file.fileActivities = await decorateActivities(file.fileActivities, projectContributors);

  return {...file, projectOwner};
};

exports.getFileContent = async (session, {projectId, fileId, version}) => {
  await checkProjectAccess(session.userId, projectId);

  let file;

  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILES_TABLE_NAME,
      ProjectionExpression: '#fileVersion',
      Key: {fileId, projectId},
      ExpressionAttributeNames: {
        '#fileVersion': 'fileVersion',
      },
    };
    const result = await documentClient.get(params).promise();
    file = result.Item;
  } catch (e) {
    throw new UnknownError(e);
  }

  if (!file) {
    throw new errors.FileNotExistsError();
  }

  try {
    const params = {
      Bucket: process.env.AWS_S3_PROJECTS_BUCKET,
      Key: generateS3BucketObjectKey(projectId, fileId, !version || version === 'latest' ? file.fileVersion : version),
    };
    return s3.getObject(params).createReadStream();
  } catch (e) {
    throw new UnknownError(e);
  }
};

exports.getFiles = async (session, {projectId}) => {
  await checkProjectAccess(session.userId, projectId);

  let files;

  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILES_TABLE_NAME,
      ConditionExpression: '#projectId = :projectId, #fileIsDeleted = :fileIsDeleted',
      ExpressionAttributeNames: {
        '#fileIsDeleted': 'fileIsDeleted',
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

  return files;
};

exports.setVersionKeep = async (session, {projectId, fileId, version, keep}) => {
  await checkProjectAccess(session.userId, projectId);

  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILE_VERSIONS_TABLE_NAME,
      Key: {fileId, versionNumber: +version},
      UpdateExpression: 'set #keep = :keep',
      ExpressionAttributeNames: {
        '#keep': 'keep',
      },
      ExpressionAttributeValues: {
        ':keep': keep,
      },
    };
    await documentClient.update(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }

  return true;
};

exports.updateFile = async (session, {projectId, fileId, fileName, fileDescription, fileTags}) => {
  await checkProjectAccess(session.userId, projectId, 'owner');

  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILES_TABLE_NAME,
      Key: {fileId, projectId},
      UpdateExpression: 'set #fileName = :fileName, #fileDescription = :fileDescription, #fileTags = :fileTags',
      ExpressionAttributeNames: {
        '#fileName': 'fileName',
        '#fileDescription': 'fileDescription',
        '#fileTags': 'fileTags',
      },
      ExpressionAttributeValues: {
        ':fileName': fileName,
        ':fileDescription': fileDescription,
        ':fileTags': fileTags,
      },
    };
    await documentClient.update(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }

  return true;
};

async function checkProjectAccess(userId, projectId, accessType) {
  let project;
  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_PROJECTS_TABLE_NAME,
      ProjectionExpression: '#projectOwner, #projectContributorIds, #projectContributors',
      Key: {projectId},
      ExpressionAttributeNames: {
        '#projectContributorIds': 'projectContributorIds',
        '#projectContributors': 'projectContributors',
        '#projectOwner': 'projectOwner',
      },
    };
    const result = await documentClient.get(params).promise();
    project = result.Item;
  } catch (e) {
    throw new UnknownError(e);
  }
  if (!project) {
    throw new errors.FileProjectNotExistError();
  }
  if ((!accessType || accessType === 'owner') && userId !== project.projectOwner) {
    throw new errors.FileProjectNotAuthorizedError();
  }
  if ((!accessType || accessType === 'contributor') && project.projectContributorIds.includes(userId)) {
    throw new errors.FileProjectNotAuthorizedError();
  }
  return project;
}

async function createActivityCancel(userId, file, activityDescription) {
  const lastFileActivity = file.fileActivities?.[0];

  // File should be at pulled state.
  if (lastFileActivity?.status !== FILE_ACTIVITY_STATUS.PULLED) {
    throw new errors.FileNotPulledError();
  }

  // Pull activity should be performed by current user.
  if (lastFileActivity?.userId !== userId) {
    throw new errors.FileAlreadyPulledError();
  }

  const newActivity = {
    activityCreateTime: new Date().toISOString(),
    activityDescription,
    estimatedPushTime: lastFileActivity.estimatedPushTime,
    fileVersion: file.fileVersion,
    pullTime: lastFileActivity.activityCreateTime,
    status: FILE_ACTIVITY_STATUS.CANCELLED,
    userId: userId,
  };

  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILES_TABLE_NAME,
      Key: {fileId: file.fileId, projectId: file.projectId},
      UpdateExpression: 'set #fileActivities = list_append(:fileActivities, #fileActivities)',
      ExpressionAttributeNames: {
        '#fileActivities': 'fileActivities',
      },
      ExpressionAttributeValues: {
        ':fileActivities': [newActivity],
      },
    };
    await documentClient.update(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }

  return newActivity;
}

async function createActivityPull(userId, file, activityDescription, estimatedPushTime) {
  const lastFileActivity = file.fileActivities?.[0];

  // File should not be at pulled state.
  if (lastFileActivity?.status === FILE_ACTIVITY_STATUS.PULLED) {
    throw new errors.FileAlreadyPulledError();
  }

  const newActivity = {
    activityCreateTime: new Date().toISOString(),
    activityDescription,
    estimatedPushTime,
    status: FILE_ACTIVITY_STATUS.PULLED,
    userId,
    fileVersion: file.fileVersion,
  };

  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILES_TABLE_NAME,
      Key: {fileId: file.fileId, projectId: file.projectId},
      UpdateExpression: 'set #fileActivities = list_append(:fileActivities, #fileActivities)',
      ExpressionAttributeNames: {
        '#fileActivities': 'fileActivities',
      },
      ExpressionAttributeValues: {
        ':fileActivities': [newActivity],
      },
    };
    await documentClient.update(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }

  return newActivity;
}

async function createActivityPush(userId, file, activityDescription, upload) {
  const lastFileActivity = file.fileActivities?.[0];

  // File should be at pulled state.
  if (lastFileActivity?.status !== FILE_ACTIVITY_STATUS.PULLED) {
    throw new errors.FileNotPulledError();
  }

  // Pull activity should be performed by current user.
  if (lastFileActivity?.userId !== userId) {
    throw new errors.FileAlreadyPulledError();
  }

  // File should be latest.
  if (file.fileUpdateTime > lastFileActivity.activityCreateTime) {
    throw new errors.FileNotLatestError();
  }

  // Uploads file to storage.
  try {
    const params = {
      Bucket: process.env.AWS_S3_PROJECTS_BUCKET,
      Key: generateS3BucketObjectKey(file.projectId, file.fileId, file.fileVersion + 1),
      Body: fs.createReadStream(upload.path),
    };
    await s3.putObject(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }

  const newActivity = {
    activityCreateTime: new Date().toISOString(),
    activityDescription,
    estimatedPushTime: lastFileActivity.estimatedPushTime,
    fileVersion: file.fileVersion + 1,
    pullTime: lastFileActivity.activityCreateTime,
    status: FILE_ACTIVITY_STATUS.PUSHED,
    userId: userId,
  };

  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILES_TABLE_NAME,
      Key: {fileId: file.fileId, projectId: file.projectId},
      UpdateExpression:
        'set #fileActivities = list_append(:fileActivities, #fileActivities), #fileVersion = :fileVersion, #fileUpdateTime = :fileUpdateTime',
      ExpressionAttributeNames: {
        '#fileActivities': 'fileActivities',
        '#fileUpdateTime': 'fileUpdateTime',
        '#fileVersion': 'fileVersion',
      },
      ExpressionAttributeValues: {
        ':fileActivities': [newActivity],
        ':fileUpdateTime': newActivity.activityCreateTime,
        ':fileVersion': file.fileVersion + 1,
      },
    };
    await documentClient.update(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }

  // Creates a DB record for new version.
  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILE_VERSIONS_TABLE_NAME,
      Item: {
        createTime: newActivity.activityCreateTime,
        deleted: false,
        fileId: file.fileId,
        keep: false,
        projectId: file.projectId,
        userId,
        versionNumber: newActivity.fileVersion,
      },
    };
    await documentClient.put(params).promise();
  } catch (e) {
    throw new UnknownError(e);
  }

  return newActivity;
}

function generateS3BucketObjectKey(projectId, fileId, fileVersion) {
  return `${projectId}/${fileId}_v${fileVersion}`;
}
