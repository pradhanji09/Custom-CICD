const DEPLOYMENT = {
  NAME: "deployment",
  COLUMNS: {
    DEPLOYMENT_ID: "deployment_id",
    PROJECT: "project",
    ENVIRONMENT: "environment",
    BRANCH: "branch",
    COMMIT_HASH: "commit_hash",
    DEPLOYMENT_TYPE: "deployment_type",
    TRIGGER_TYPE: "trigger_type",
    STATUS: "status",
    FAILED_STEP: "failed_step",
    STARTED_AT: "started_at",
    COMPLETED_AT: "completed_at",
  },
};

module.exports = { DEPLOYMENT };
