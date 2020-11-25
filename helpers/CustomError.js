class CustomError extends Error {
  constructor(props = {}) {
    super(props.message);
    this.code = props.code;
    this.data = props.data;
    this.message = props.message
  }
}

module.exports = CustomError;
