'use strict';

const app = require('../../server');

describe('app-logtracer', function() {
  describe('start/stop app.server', function() {
    it('app.server should be started/stopped properly', function() {
      return app.server.start().then(function() {
        return app.server.stop();
      });
    });
  });
});
