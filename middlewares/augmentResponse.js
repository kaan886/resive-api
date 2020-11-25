const augmentResponse = (req, res, next) => {
  res.error = (err) => {
    res.send({code: err.code, data: err.data, message: err.message, status: 'error'});
  };

  res.success = (data, message = 'Success', code = 'SUCCESS') => {
    res.send({code, data, message, status: 'success'});
  };

  next();
};

module.exports = augmentResponse;
