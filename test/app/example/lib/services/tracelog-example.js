"use strict";

const path = require("path");

function Service (params = {}) {
  const { loggingFactory, sandboxConfig, webweaverService, tracelogService } = params;

  const L = loggingFactory.getLogger();
  const T = loggingFactory.getTracer();

  const contextPath = sandboxConfig.contextPath || "/tracelog";
  const express = webweaverService.express;

  const router = express();
  router.set("views", path.join(__dirname, "/../../views"));
  router.set("view engine", "ejs");
  router.route("/tracing/index").get(function(req, res, next) {
    L.has("debug") && L.log("debug", T.add({
      reqId: tracelogService.getRequestId(req)
    }).toMessage({
      text: "--- RequestID --- : ${reqId}"
    }));
    res.render("index", {requestId: req.traceRequestId});
  });
  router.route("/bypass/index").get(function(req, res, next) {
    res.render("index", {requestId: req.traceRequestId || "[empty]"});
  });

  tracelogService.push([
    {
      name: "saola-plugin-logtracer-example",
      path: contextPath,
      middleware: router
    }
  ], sandboxConfig.priority);
};

Service.referenceList = [ "tracelogService", "webweaverService" ];

module.exports = Service;
