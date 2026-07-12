const DEPLOYMENT = {
  NAME: "deployment",
  COLUMNS: {
    DEPLOYMENT_ID: "deployment_id",
    PROJECT: "project",
    ENVIRONMENT: "environment",
    BRANCH: "branch",
    COMMIT_HASH: "commit_hash",
    DEPLOYMENT_TYPE: "deployment_type",
    DEPLOYED_SLOT: "deployed_slot",
    TRIGGER_TYPE: "trigger_type",
    STATUS: "status",
    SKIP_REASON: "skip_reason",
    STARTED_AT: "started_at",
    COMPLETED_AT: "completed_at",
  },
};

const DEPLOYMENT_LOGS = {
  NAME: "deployment_logs",
  COLUMNS: {
    ID: "id",
    DEPLOYMENT_ID: "deployment_id",
    STEP: "step",
    COMMAND: "command",
    STATUS: "status",
    ERROR: "error",
    STARTED_AT: "started_at",
    COMPLETED_AT: "completed_at",
  },
};

module.exports = { DEPLOYMENT_LOGS, DEPLOYMENT };
