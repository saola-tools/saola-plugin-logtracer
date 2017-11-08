var contextPath = '/tracelog-demo';

module.exports = {
  application: {
    contextPath: contextPath
  },
  plugins: {
    appTracelog: {
      tracingRequestName: 'traceRequestId',
      tracingRequestHeader: 'X-Trace-Request-Id',
      tracingPaths: [ contextPath + '/*' ]
    },
    appWebweaver: {
    }
  }
};
