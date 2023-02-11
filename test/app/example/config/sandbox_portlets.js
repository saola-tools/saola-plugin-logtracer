"use strict";

module.exports = {
  plugins: {
    pluginLogtracer: {
      portlets: {
        default: {},
        manager: {}
      }
    },
    pluginWebweaver: {
      portlets: {
        default: {},
        manager: {}
      }
    },
    pluginWebserver: {
      portlets: {
        default: {
          port: 7979
        },
        manager: {
          port: 9797
        }
      }
    }
  }
};
