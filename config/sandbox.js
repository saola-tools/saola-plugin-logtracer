module.exports = {
  plugins: {
    appTracelog: {
      tracingRequestName: 'requestId',
      tracingRequestHeader: 'X-Request-Id',
      tracingPaths: []
    }
  }
};
