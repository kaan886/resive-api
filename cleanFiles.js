require('dotenv').config();

const AWS = require('aws-sdk');
const moment = require('moment');

AWS.config.update({region: process.env.AWS_REGION});

const documentClient = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

console.log('Cleaning is started.');
clean()
  .then(() => console.log('Cleaning is finished.'))
  .catch(console.error);

async function clean() {
  const createTime = moment().subtract(process.env.FILE_LIFETIME, 'day').startOf('day').toISOString();

  let versions;
  try {
    const params = {
      TableName: process.env.AWS_DYNAMODB_FILE_VERSIONS_TABLE_NAME,
      FilterExpression: '#deleted = :deleted and #keep = :keep and #createTime < :createTime',
      ExpressionAttributeNames: {
        '#createTime': 'createTime',
        '#deleted': 'deleted',
        '#keep': 'keep',
      },
      ExpressionAttributeValues: {
        ':createTime': createTime,
        ':deleted': false,
        ':keep': false,
      },
    };
    const result = await documentClient.scan(params).promise();
    versions = result.Items;
  } catch (e) {
    console.log('Cannot fetch versions from DynamoDB.');
    throw e;
  }

  for (const version of versions) {
    try {
      const params = {
        Bucket: process.env.AWS_S3_PROJECTS_BUCKET,
        Key: `${version.projectId}/${version.fileId}_v${version.versionNUmber}`,
      };
      await s3.deleteObject(params).promise();
    } catch (e) {
      console.log(`Cannot delete version file. ${JSON.stringify(version)}`);
      throw e;
    }

    try {
      const params = {
        TableName: process.env.AWS_DYNAMODB_FILE_VERSIONS_TABLE_NAME,
        Key: {fileId: version.fileId, versionNumber: version.versionNumber},
        UpdateExpression: 'set #deleted = :deleted',
        ExpressionAttributeNames: {
          '#deleted': 'deleted',
        },
        ExpressionAttributeValues: {
          ':deleted': true,
        },
      };
      await documentClient.update(params).promise();
    } catch (e) {
      console.log(`Cannot update version db record. ${JSON.stringify(version)}`);
    }
  }
}
