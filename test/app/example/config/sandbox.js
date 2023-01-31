"use strict";

const contextPath = "/tracelog-demo";

module.exports = {
  application: {
    contextPath: contextPath
  },
  plugins: {
    pluginLogtracer: {
      tracingRequestName: "traceRequestId",
      tracingRequestHeader: "X-Trace-Request-Id",
      tracingPaths: [ contextPath + "/tracing" ],
      tracingBoundaryEnabled: true
    },
    pluginWebweaver: {
    }
  }
};
