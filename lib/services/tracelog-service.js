'use strict';

var Devebot = require('devebot');
var lodash = Devebot.require('lodash');
var debugx = Devebot.require('debug')('appTracelog:service');
var requestTracer = require('request-tracer');

var Service = function(params) {
  debugx.enabled && debugx(' + constructor begin ...');

  params = params || {};

  var self = this;
  var pluginCfg = params.sandboxConfig;
  var logger = params.loggingFactory.getLogger();

  var tracingContext = lodash.get(params, ['sandboxConfig', 'plugins', 'appWebserver']);
  var tracingListener = requestTracer({ express: params.webweaverService.express });
  tracingListener.on('newProcess', function(traceProcessId) {
    logger.debug('New process[%s] with configuration: %s', traceProcessId, JSON.stringify(tracingContext));
  });
  tracingListener.on('newSession', function(traceSessionId, traceProcessId, ext) {
    logger.debug('New session[%s] in process[%s], sessionID: %s', traceSessionId, traceProcessId, ext.sessionID);
  });
  tracingListener.on('newRequest', function(traceRequestId, traceSessionId) {
    logger.debug('New request[%s] in session[%s]', traceRequestId, traceSessionId);
  });

  var tracingPaths = lodash.get(pluginCfg, ['tracingPaths']);
  if (lodash.isString(tracingPaths)) tracingPaths = [ tracingPaths ];
  if (!lodash.isArray(tracingPaths)) tracingPaths = [];

  var tracingBoundary = function(req, res, next) {
    logger.debug('Begin request processing - Request[%s]', req.traceRequestId);
    req.on('end', function() {
      logger.debug('Request has been finished - Request[%s]', req.traceRequestId);
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

  self.getTracingListenerLayer = function(branches) {
    return {
      name: 'app-tracelog-listener',
      path: tracingPaths,
      middleware: tracingListener.interceptor(),
      branches: branches
    }
  }

  self.addTracingPaths = function(paths) {
    if (lodash.isEmpty(paths)) return;
    if (lodash.isString(paths)) paths = [paths];
    tracingPaths = lodash.union(tracingPaths, paths);
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
