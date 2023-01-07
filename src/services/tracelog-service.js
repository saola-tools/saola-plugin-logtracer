"use strict";

const Devebot = require("devebot");
const chores = Devebot.require("chores");
const lodash = Devebot.require("lodash");

const { DEFAULT_PORTLET_NAME, standardizeConfig } = require("app-webserver").require("portlet");

function TracelogPortlet (params = {}) {
  const { L, T, portletConfig, portletName, portletForwarder } = params;

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
        req.get(portletConfig.tracingRequestHeader) || req.query[tracingRequestName];
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
    res.setHeader(portletConfig.tracingRequestHeader, req[tracingRequestName]);
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
    if (portletForwarder.hasPortlet(portletName)) {
      priority = (typeof(priority) === "number") ? priority : portletConfig.priority;
      portletForwarder.getPortlet(portletName).push(layerOrBranches, priority);
    }
  };

  if (portletConfig.autowired !== false && portletForwarder.hasPortlet(portletName)) {
    let layers = [ this.getTracingListenerLayer() ];
    if (portletConfig.tracingBoundaryEnabled) {
      layers.push(this.getTracingBoundaryLayer());
    }
    portletForwarder.getPortlet(portletName).push(layers, portletConfig.priority);
  }
}

function TracelogService (params = {}) {
  const { packageName, loggingFactory, sandboxConfig, webweaverService } = params;
  const L = loggingFactory.getLogger();
  const T = loggingFactory.getTracer();
  const blockRef = chores.getBlockRef(__filename, packageName || "app-webweaver");

  const pluginConfig = standardizeConfig(sandboxConfig);
  const portletForwarder = webweaverService;

  const _portlets = {};
  lodash.forOwn(pluginConfig.portlets, function(portletConfig, portletName) {
    _portlets[portletName] = new TracelogPortlet({ L, T, blockRef, portletConfig, portletName, portletForwarder });
  });

  this.getPortletNames = function() {
    return lodash.keys(_portlets);
  };

  this.hasPortlet = function(portletName) {
    portletName = portletName || DEFAULT_PORTLET_NAME;
    if (!portletForwarder.hasPortlet(portletName)) {
      return false;
    }
    return portletName in _portlets;
  };

  this.getPortlet = function(portletName) {
    portletName = portletName || DEFAULT_PORTLET_NAME;
    return _portlets[portletName];
  };

  // @deprecated
  this.push = function(layerOrBranches, priority) {
    return this.hasPortlet() && this.getPortlet().push(layerOrBranches, priority) || undefined;
  };
};

TracelogService.referenceHash = {
  webweaverService: "app-webweaver/webweaverService"
};

module.exports = TracelogService;
