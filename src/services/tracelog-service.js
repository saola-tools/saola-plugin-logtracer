"use strict";

const Devebot = require("devebot");
const chores = Devebot.require("chores");
const lodash = Devebot.require("lodash");

const portlet = require("app-webserver").require("portlet");
const { getPortletDescriptors, PortletMixiner } = portlet;

function TracelogService (params = {}) {
  const { packageName, loggingFactory, sandboxOrigin, sandboxConfig, webweaverService } = params;

  PortletMixiner.call(this, {
    portletDescriptors: getPortletDescriptors(sandboxConfig),
    portletCommonConfig: sandboxOrigin,
    portletReferenceHolders: { webweaverService },
    portletArguments: { packageName, loggingFactory },
    PortletConstructor: TracelogPortlet,
  });

  // @deprecated
  this.getRequestId = function(req) {
    return this.hasPortlet() && this.getPortlet().getRequestId(req) || undefined;
  };

  // @deprecated
  this.addTracingPaths = function(paths) {
    return this.hasPortlet() && this.getPortlet().addTracingPaths(paths) || undefined;
  };

  // @deprecated
  this.getTracingBoundaryLayer = function(branches) {
    return this.hasPortlet() && this.getPortlet().getTracingBoundaryLayer(branches) || undefined;
  };

  // @deprecated
  this.getTracingListenerLayer = function(branches) {
    return this.hasPortlet() && this.getPortlet().getTracingListenerLayer(branches) || undefined;
  };

  // @deprecated
  this.push = function(layerOrBranches, priority) {
    return this.hasPortlet() && this.getPortlet().push(layerOrBranches, priority) || undefined;
  };
};

Object.assign(TracelogService.prototype, PortletMixiner.prototype);

TracelogService.referenceHash = {
  webweaverService: "app-webweaver/webweaverService"
};

function TracelogPortlet (params = {}) {
  const { packageName, loggingFactory, portletConfig, portletName, webweaverService } = params;

  const L = loggingFactory.getLogger();
  const T = loggingFactory.getTracer();
  const blockRef = chores.getBlockRef(__filename, packageName);

  L && L.has("silly") && L.log("silly", T && T.add({ portletName }).toMessage({
    tags: [ blockRef, "TracelogPortlet", "starting" ],
    text: " - portlet: ${portletName}"
  }));

  const tracingRequestName = portletConfig.tracingRequestName || "requestId";

  this.getRequestId = function(req) {
    return req && req[tracingRequestName];
  };

  let tracingPaths = lodash.get(portletConfig, ["tracingPaths"]);
  if (lodash.isString(tracingPaths)) tracingPaths = [ tracingPaths ];
  if (!lodash.isArray(tracingPaths)) tracingPaths = [];

  this.addTracingPaths = function(paths) {
    if (lodash.isEmpty(paths)) return;
    if (lodash.isString(paths)) paths = [paths];
    tracingPaths = lodash.union(tracingPaths, paths);
  };

  let tracingBoundary = function(req, res, next) {
    L && L.has("debug") && L.log("debug", T && T.add({
      requestId: req[tracingRequestName]
    }).toMessage({
      text: "Req[${requestId}] is processing (begin)"
    }));
    req.on("end", function() {
      L && L.has("debug") && L.log("debug", T && T.add({
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
        portletConfig.tracingRequestHeader && req.get(portletConfig.tracingRequestHeader) ||
        req.query[tracingRequestName];
    //
    if (!req[tracingRequestName]) {
      req[tracingRequestName] = T.getLogID();
      L && L.has("info") && L.log("info", T && T.add({
        requestId: req[tracingRequestName]
      }).toMessage({
        text: "Req[${requestId}] is generated"
      }));
    }
    //
    if (portletConfig.tracingRequestHeader) {
      res.setHeader(portletConfig.tracingRequestHeader, req[tracingRequestName]);
      L && L.has("info") && L.log("info", T && T.add({
        requestId: req[tracingRequestName]
      }).toMessage({
        text: "Req[${requestId}] is set to response header"
      }));
    }
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
    priority = (typeof(priority) === "number") ? priority : portletConfig.priority;
    webweaverService.push(layerOrBranches, priority);
  };

  if (portletConfig.autowired !== false) {
    let layers = [ this.getTracingListenerLayer() ];
    if (portletConfig.tracingBoundaryEnabled) {
      layers.push(this.getTracingBoundaryLayer());
    }
    webweaverService.push(layers, portletConfig.priority);
  }
}

module.exports = TracelogService;
