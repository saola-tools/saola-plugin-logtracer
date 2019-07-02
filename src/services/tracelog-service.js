'use strict';

const Devebot = require('devebot');
const chores = Devebot.require('chores');
const lodash = Devebot.require('lodash');

function TracelogService(params = {}) {
  const L = params.loggingFactory.getLogger();
  const T = params.loggingFactory.getTracer();
  const packageName = params.packageName || 'app-tracelog';
  const blockRef = chores.getBlockRef(__filename, packageName);

  const pluginCfg = params.sandboxConfig || {};
  const tracingRequestName = pluginCfg.tracingRequestName || 'requestId';
  const webweaverService = params["app-webweaver/webweaverService"];

  this.getRequestId = function(req) {
    return req && req[tracingRequestName];
  }

  let tracingPaths = lodash.get(pluginCfg, ['tracingPaths']);
  if (lodash.isString(tracingPaths)) tracingPaths = [ tracingPaths ];
  if (!lodash.isArray(tracingPaths)) tracingPaths = [];

  this.addTracingPaths = function(paths) {
    if (lodash.isEmpty(paths)) return;
    if (lodash.isString(paths)) paths = [paths];
    tracingPaths = lodash.union(tracingPaths, paths);
  }

  let tracingBoundary = function(req, res, next) {
    L.has('debug') && L.log('debug', T.add({
      requestId: req[tracingRequestName]
    }).toMessage({
      text: 'Request[${requestId}] is processing (begin)'
    }));
    req.on('end', function() {
      L.has('debug') && L.log('debug', T.add({
        requestId: req[tracingRequestName]
      }).toMessage({
        text: 'Request[${requestId}] has finished (end)'
      }));
    });
    next();
  };

  this.getTracingBoundaryLayer = function(branches) {
    return {
      name: 'app-tracelog-boundary',
      path: tracingPaths,
      middleware: tracingBoundary,
      branches: branches
    }
  }

  let requestInterceptor = function(req, res, next) {
    req[tracingRequestName] = req[tracingRequestName] ||
        req.get(pluginCfg.tracingRequestHeader) || req.query[tracingRequestName];
    if (!req[tracingRequestName]) {
      req[tracingRequestName] = T.getLogID();
      L.has('info') && L.log('info', T.add({
        requestId: req[tracingRequestName]
      }).toMessage({
        text: 'RequestID[${requestId}] is generated'
      }));
    }
    res.setHeader(pluginCfg.tracingRequestHeader, req[tracingRequestName]);
    L.has('info') && L.log('info', T.add({
      requestId: req[tracingRequestName]
    }).toMessage({
      text: 'RequestID[${requestId}] is set to response header'
    }));
    next();
  };

  this.getTracingListenerLayer = function(branches) {
    return {
      name: 'app-tracelog-listener',
      path: tracingPaths,
      middleware: requestInterceptor,
      branches: branches
    }
  }

  this.push = function(layerOrBranches, priority) {
    priority = (typeof(priority) === 'number') ? priority : pluginCfg.priority;
    webweaverService.push(layerOrBranches, priority);
  }

  if (pluginCfg.autowired !== false) {
    let layers = [ this.getTracingListenerLayer() ];
    if (pluginCfg.tracingBoundaryEnabled) {
      layers.push(this.getTracingBoundaryLayer());
    }
    webweaverService.push(layers, pluginCfg.priority);
  }
};

TracelogService.referenceList = [ "app-webweaver/webweaverService" ];

module.exports = TracelogService;
