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
            required: ["host", "username", "private_key_path"],
            properties: {
              host: { type: "string" },
              username: { type: "string" },
              private_key_path: { type: "string" },
              port: { type: "integer", default: 22 },
            },
          },
          steps: {
            type: "array",
            items: { type: "string" },
          },
          health_check: {
            type: "object",
            required: ["endpoint"],
            properties: {
              endpoint: { type: "string" },
              timeout: { type: "integer", default: 5000 },
              retries: { type: "integer", default: 2 },
              expected_status: { type: "integer", default: 200 },
            },
          },
        },
      },
      minItems: 1,
    },
  },
};

module.exports = projectConfigSchema;
