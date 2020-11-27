require('dotenv').config();

global.CustomError = require('./helpers/CustomError');
global.UnknownError = require('./helpers/UnknownError');

const express = require('express');
const AWS = require('aws-sdk');
const app = express();

app.use(require('./middlewares/augmentResponse'));
app.use(require('cors')());
app.use(require('body-parser').json());
app.use(require('body-parser').urlencoded());
app.use(require('./middlewares/parseToken'));

app.use('/files', require('./features/file/router'));
app.use('/projects', require('./features/project/router'));
app.use('/sessions', require('./features/session/router'));
app.use('/users', require('./features/user/router'));

app.use(require('./middlewares/handleInternalServerError'));
app.use(require('./middlewares/handleNotFound'));

app.listen(+process.env.PORT, () => {
  AWS.config.update({region: process.env.AWS_REGION});
  console.log(`${process.env.APP_NAME} is up and running on port ${process.env.PORT}.`);
});
