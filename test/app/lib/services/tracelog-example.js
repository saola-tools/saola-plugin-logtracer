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
  router.route('/index').get(function(req, res, next) {
    logger.debug('RequestId: %s', req.traceRequestId);
    res.render('index', {requestId: req.traceRequestId});
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

Service.argumentSchema = {
  "id": "tracelogExample",
  "type": "object",
  "properties": {
    "tracelogService": {
      "type": "object"
    },
    "webweaverService": {
      "type": "object"
    }
  }
};

module.exports = Service;
