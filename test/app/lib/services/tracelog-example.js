'use strict';

var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var lodash = Devebot.require('lodash');
var debuglog = Devebot.require('debug')('appTracelog:example');

var Service = function(params) {
  debuglog.isEnabled && debuglog(' + constructor begin ...');

  params = params || {};

  var self = this;

  var logger = params.loggingFactory.getLogger();
  var pluginCfg = params.sandboxConfig;
  var contextPath = pluginCfg.contextPath || '/tracelog';
  var express = params.webweaverService.express;

  var router = new express();
  router.set('views', __dirname + '/../../views');
  router.set('view engine', 'ejs');
  router.route('/tracing/index').get(function(req, res, next) {
    logger.debug('--- RequestID --- : %s', params.tracelogService.getRequestId(req));
    res.render('index', {requestId: req.traceRequestId});
  });
  router.route('/bypass/index').get(function(req, res, next) {
    res.render('index', {requestId: req.traceRequestId || '[empty]'});
  });

  params.tracelogService.push([
    {
      name: 'app-tracelog-example',
      path: contextPath,
      middleware: router
    }
  ], pluginCfg.priority);

  debuglog.isEnabled && debuglog(' - constructor end!');
};

Service.referenceList = [ "tracelogService", "webweaverService" ];

module.exports = Service;
