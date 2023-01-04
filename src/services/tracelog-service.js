"use strict";

const Devebot = require("devebot");
const lodash = Devebot.require("lodash");

function TracelogService (params = {}) {
  const { loggingFactory, sandboxConfig, webweaverService } = params;
  const L = loggingFactory.getLogger();
  const T = loggingFactory.getTracer();

  const tracingRequestName = sandboxConfig.tracingRequestName || "requestId";

  this.getRequestId = function(req) {
    return req && req[tracingRequestName];
  };

  let tracingPaths = lodash.get(sandboxConfig, ["tracingPaths"]);
  if (lodash.isString(tracingPaths)) tracingPaths = [ tracingPaths ];
  if (!lodash.isArray(tracingPaths)) tracingPaths = [];

  this.addTracingPaths = function(paths) {
    if (lodash.isEmpty(paths)) return;
    if (lodash.isString(paths)) paths = [paths];
    tracingPaths = lodash.union(tracingPaths, paths);
  };

  let tracingBoundary = function(req, res, next) {
    L.has("debug") && L.log("debug", T.add({
      requestId: req[tracingRequestName]
    }).toMessage({
      text: "Req[${requestId}] is processing (begin)"
    }));
    req.on("end", function() {
      L.has("debug") && L.log("debug", T.add({
        requestId: req[tracingRequestName]
      }).toMessage({
        text: "Req[${requestId}] has finished (end)"
      }));
    });
    next();
  };

  this.getTracingBoundaryLayer = function(branches) {
    return {
      name: "app-tracelog-boundary",
      path: tracingPaths,
      middleware: tracingBoundary,
      branches: branches
    };
  };

  let requestInterceptor = function(req, res, next) {
    req[tracingRequestName] = req[tracingRequestName] ||
        req.get(sandboxConfig.tracingRequestHeader) || req.query[tracingRequestName];
    //
    if (!req[tracingRequestName]) {
      req[tracingRequestName] = T.getLogID();
      L.has("info") && L.log("info", T.add({
        requestId: req[tracingRequestName]
      }).toMessage({
        text: "Req[${requestId}] is generated"
      }));
    }
    //
    res.setHeader(sandboxConfig.tracingRequestHeader, req[tracingRequestName]);
    L.has("info") && L.log("info", T.add({
      requestId: req[tracingRequestName]
    }).toMessage({
      text: "Req[${requestId}] is set to response header"
    }));
    //
    next();
  };

  this.getTracingListenerLayer = function(branches) {
    return {
      name: "app-tracelog-listener",
      path: tracingPaths,
      middleware: requestInterceptor,
      branches: branches
    };
  };

  this.push = function(layerOrBranches, priority) {
    priority = (typeof(priority) === "number") ? priority : sandboxConfig.priority;
    webweaverService.push(layerOrBranches, priority);
  };

  if (sandboxConfig.autowired !== false) {
    let layers = [ this.getTracingListenerLayer() ];
    if (sandboxConfig.tracingBoundaryEnabled) {
      layers.push(this.getTracingBoundaryLayer());
    }
    webweaverService.push(layers, sandboxConfig.priority);
  }
};

TracelogService.referenceHash = {
  webweaverService: "app-webweaver/webweaverService"
};

module.exports = TracelogService;
