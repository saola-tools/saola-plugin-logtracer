module.exports = {
  "config": {
    "validation": {
      "schema": {
        "type": "object",
        "properties": {
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
        },
        "additionalProperties": false
      }
    }
  }
};
