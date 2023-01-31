module.exports = {
  plugins: {
    pluginLogtracer: {
      tracingRequestName: 'requestId',
      tracingRequestHeader: 'X-Request-Id',
      tracingPaths: [],
      tracingBoundaryEnabled: false
    }
  }
};
