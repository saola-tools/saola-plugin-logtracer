'use strict';

var Devebot = require('devebot');
var lodash = Devebot.require('lodash');
var debugx = Devebot.require('debug')('appTracelog:service');
var LogTracer = require('logolite').LogTracer;

var Service = function(params) {
  debugx.enabled && debugx(' + constructor begin ...');

  params = params || {};

  var self = this;
  var pluginCfg = params.sandboxConfig;
  var logger = params.loggingFactory.getLogger();

  var tracingPaths = lodash.get(pluginCfg, ['tracingPaths']);
  if (lodash.isString(tracingPaths)) tracingPaths = [ tracingPaths ];
  if (!lodash.isArray(tracingPaths)) tracingPaths = [];

  self.addTracingPaths = function(paths) {
    if (lodash.isEmpty(paths)) return;
    if (lodash.isString(paths)) paths = [paths];
    tracingPaths = lodash.union(tracingPaths, paths);
  }

  var tracer = LogTracer.ROOT.branch({
    key: 'pluginName',
    value: 'app-tracelog'
  });

  var tracingBoundary = function(req, res, next) {
    logger.debug(tracer.add({
      message: 'Request is coming',
      requestId: req[pluginCfg.tracingRequestName]
    }).toMessage());
    req.on('end', function() {
      logger.debug(tracer.add({
        message: 'Request has finished',
        requestId: req[pluginCfg.tracingRequestName]
      }).toMessage());
    });
    next();
  };

  self.getTracingBoundaryLayer = function(branches) {
    return {
      name: 'app-tracelog-boundary',
      path: tracingPaths,
      middleware: tracingBoundary,
      branches: branches
    }
  }

  var requestInterceptor = function(req, res, next) {
    req[pluginCfg.tracingRequestName] = req[pluginCfg.tracingRequestName] ||
        req.get(pluginCfg.tracingRequestHeader) || req.query[pluginCfg.tracingRequestName];
    if (!req[pluginCfg.tracingRequestName]) {
      req[pluginCfg.tracingRequestName] = LogTracer.getLogID();
      logger.info(tracer.add({
        message: 'RequestID is generated',
        requestId: req[pluginCfg.tracingRequestName]
      }).toMessage());
    }
    res.setHeader(pluginCfg.tracingRequestHeader, req[pluginCfg.tracingRequestName]);
    logger.info(tracer.add({
      message: 'RequestID is set to response header',
      requestId: req[pluginCfg.tracingRequestName]
    }).toMessage());
    next();
  };

  self.getTracingListenerLayer = function(branches) {
    return {
      name: 'app-tracelog-listener',
      path: tracingPaths,
      middleware: requestInterceptor,
      branches: branches
    }
  }

  self.push = function(layerOrBranches, priority) {
    priority = (typeof(priority) === 'number') ? priority : pluginCfg.priority;
    params.webweaverService.push(layerOrBranches, priority);
  }

  if (pluginCfg.autowired !== false) {
    params.webweaverService.push([
      self.getTracingListenerLayer(),
      self.getTracingBoundaryLayer()
    ], pluginCfg.priority);
  }

  debugx.enabled && debugx(' - constructor end!');
};

Service.argumentSchema = {
  "id": "tracelogService",
  "type": "object",
  "properties": {
    "webweaverService": {
      "type": "object"
    }
  }
};

module.exports = Service;
