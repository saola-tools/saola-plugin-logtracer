"use strict";

const CONFIG_OBJECT_PROPERTIES = {
  "enabled": {
    "type": "boolean"
  },
  "tracingRequestName": {
    "type": "string"
  },
  "tracingRequestHeader": {
    "type": "string"
  },
  "tracingBoundaryEnabled": {
    "type": "boolean"
  },
  "tracingPaths": {
    "type": "array",
    "items": {
      "type": "string"
    }
  },
  "autowired": {
    "type": "boolean"
  },
  "priority": {
    "type": "number"
  }
};

module.exports = {
  "config": {
    "validation": {
      "schema": {
        "type": "object",
        "properties": Object.assign({
          "portlets": {
            "type": "object",
            "patternProperties": {
              "^[a-zA-Z][\\w-]*$": {
                "type": "object",
                "properties": CONFIG_OBJECT_PROPERTIES,
                "additionalProperties": false
              }
            }
          },
        }, CONFIG_OBJECT_PROPERTIES),
        "additionalProperties": false
      }
    }
  }
};
