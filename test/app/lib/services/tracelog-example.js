'use strict';

var Devebot = require('devebot');
var Promise = Devebot.require('bluebird');
var lodash = Devebot.require('lodash');
var pinbug = Devebot.require('pinbug');

var Service = function(params) {
  var dbg = pinbug('appTracelog:example');
  dbg.isEnabled && dbg(' + constructor begin ...');

  params = params || {};

  var self = this;

  var LX = params.loggingFactory.getLogger();
  var LT = params.loggingFactory.getTracer();

  var pluginCfg = params.sandboxConfig;
  var contextPath = pluginCfg.contextPath || '/tracelog';
  var express = params.webweaverService.express;

  var router = new express();
  router.set('views', __dirname + '/../../views');
  router.set('view engine', 'ejs');
  router.route('/tracing/index').get(function(req, res, next) {
    LX.has('debug') && LX.log('debug', LT.add({
      reqId: params.tracelogService.getRequestId(req)
    }).toMessage({
      text: '--- RequestID --- : ${reqId}'
    }));
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

  dbg.isEnabled && dbg(' - constructor end!');
};

Service.referenceList = [ "tracelogService", "webweaverService" ];

module.exports = Service;
