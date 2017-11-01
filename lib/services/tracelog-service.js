'use strict';

var events = require('events');
var util = require('util');

var requestTracer = require('request-tracer');

var Devebot = require('devebot');
var lodash = Devebot.require('lodash');
var debug = Devebot.require('debug');
var debuglog = debug('appTracelog:service');

var Service = function(params) {
  debuglog.isEnabled && debuglog(' + constructor begin ...');

  params = params || {};

  var self = this;
  var pluginCfg = lodash.get(params, ['sandboxConfig', 'plugins', 'appTracelog'], {});

  self.logger = params.loggingFactory.getLogger();

  self.getSandboxName = function() {
    return params.sandboxName;
  };

  var tracingContext = lodash.get(params, ['sandboxConfig', 'plugins', 'appWebserver']);
  var tracingListener = requestTracer({ express: params.webweaverService.express });
  tracingListener.on('newProcess', function(traceProcessId) {
    self.logger.debug('New process[%s] with configuration: %s', traceProcessId, JSON.stringify(tracingContext));
  });
  tracingListener.on('newSession', function(traceSessionId, traceProcessId, ext) {
    self.logger.debug('New session[%s] in process[%s], sessionID: %s', traceSessionId, traceProcessId, ext.sessionID);
  });
  tracingListener.on('newRequest', function(traceRequestId, traceSessionId) {
    self.logger.debug('New request[%s] in session[%s]', traceRequestId, traceSessionId);
  });

  var tracingPaths = lodash.get(pluginCfg, ['tracingPaths']);
  if (lodash.isString(tracingPaths)) tracingPaths = [ tracingPaths ];
  if (!lodash.isArray(tracingPaths)) tracingPaths = [];

  var traceingBoundary = function(req, res, next) {
    self.logger.debug('Begin request processing - Request[%s]', req.traceRequestId);
    req.on('end', function() {
      self.logger.debug('Request has been finished - Request[%s]', req.traceRequestId);
    });
    next();
  };

  self.getTracingBoundaryLayer = function(branches) {
    return {
      name: 'app-tracelog-boundary',
      path: tracingPaths,
      middleware: traceingBoundary,
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

  self.getServiceInfo = function() {
    return {};
  };

  self.getServiceHelp = function() {
    return {};
  };

  debuglog.isEnabled && debuglog(' - constructor end!');
};

Service.argumentSchema = {
  "id": "tracelogService",
  "type": "object",
  "properties": {
    "sandboxName": {
      "type": "string"
    },
    "sandboxConfig": {
      "type": "object"
    },
    "profileConfig": {
      "type": "object"
    },
    "generalConfig": {
      "type": "object"
    },
    "loggingFactory": {
      "type": "object"
    },
    "webweaverService": {
      "type": "object"
    }
  }
};

module.exports = Service;
