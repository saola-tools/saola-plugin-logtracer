'use strict';

var Devebot = require('devebot');
var chores = Devebot.require('chores');
var lodash = Devebot.require('lodash');

var Service = function(params) {
  params = params || {};
  var self = this;

  var LX = params.loggingFactory.getLogger();
  var TR = params.loggingFactory.getTracer();
  var packageName = params.packageName || 'app-tracelog';
  var blockRef = chores.getBlockRef(__filename, packageName);

  LX.has('silly') && LX.log('silly', TR.toMessage({
    tags: [ blockRef, 'constructor-begin' ],
    text: ' + constructor start ...'
  }));

  var pluginCfg = params.sandboxConfig;
  var tracingRequestName = pluginCfg.tracingRequestName || 'requestId';

  self.getRequestId = function(req) {
    return req && req[tracingRequestName];
  }

  var tracingPaths = lodash.get(pluginCfg, ['tracingPaths']);
  if (lodash.isString(tracingPaths)) tracingPaths = [ tracingPaths ];
  if (!lodash.isArray(tracingPaths)) tracingPaths = [];

  self.addTracingPaths = function(paths) {
    if (lodash.isEmpty(paths)) return;
    if (lodash.isString(paths)) paths = [paths];
    tracingPaths = lodash.union(tracingPaths, paths);
  }

  var tracingBoundary = function(req, res, next) {
    LX.has('debug') && LX.log('debug', TR.add({
      requestId: req[tracingRequestName]
    }).toMessage({
      text: 'Request[${requestId}] is coming'
    }));
    req.on('end', function() {
      LX.has('debug') && LX.log('debug', TR.add({
        requestId: req[tracingRequestName]
      }).toMessage({
        text: 'Request[${requestId}] has finished'
      }));
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
    req[tracingRequestName] = req[tracingRequestName] ||
        req.get(pluginCfg.tracingRequestHeader) || req.query[tracingRequestName];
    if (!req[tracingRequestName]) {
      req[tracingRequestName] = TR.getLogID();
      LX.has('info') && LX.log('info', TR.add({
        requestId: req[tracingRequestName]
      }).toMessage({
        text: 'RequestID[${requestId}] is generated'
      }));
    }
    res.setHeader(pluginCfg.tracingRequestHeader, req[tracingRequestName]);
    LX.has('info') && LX.log('info', TR.add({
      requestId: req[tracingRequestName]
    }).toMessage({
      text: 'RequestID[${requestId}] is set to response header'
    }));
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

  LX.has('silly') && LX.log('silly', TR.toMessage({
    tags: [ blockRef, 'constructor-end' ],
    text: ' - constructor end!'
  }));
};

Service.referenceList = [ "webweaverService" ];

module.exports = Service;
