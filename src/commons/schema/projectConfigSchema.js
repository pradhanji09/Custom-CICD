const projectConfigSchema = {
  type: "object",
  required: ["repo", "environments"],
  properties: {
    repo: {
      type: "string",
    },
    environments: {
      type: "array",
      items: {
        type: "object",
        required: ["environment_name", "branch", "deployment_type"],
        properties: {
          environment_name: { type: "string" },
          branch: { type: "string" },
          deployment_type: {
            type: "string",
            enum: ["LOCAL", "REMOTE"],
          },
          timeout: { type: "integer" },
          ssh: {
            type: "object",
            required: ["host", "user", "privateKey"],
            properties: {
              host: { type: "string" },
              user: { type: "string" },
              privateKey: { type: "string" },
              port: { type: "integer", default: 22 },
            },
          },
          steps: {
            type: "array",
            items: { type: "string" },
          },
          health_check: {
            type: "object",
            required: ["url"],
            properties: {
              url: { type: "string", format: "uri" },
              timeout: { type: "integer", default: 5000 },
            },
          },
        },
      },
      minItems: 1,
    },
  },
};

module.exports = projectConfigSchema;
