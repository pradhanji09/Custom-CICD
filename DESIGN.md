# Funcitonal requirement:

- A Config-driven CI/CD server that can deploy sever in local or remote[SSH].
- When any changes pushed repo, github webhooks trigger and
  configured branch will be deloyed to they conrrespondens enviroment. [production, staging]
- The Github Signature[HMAC] verification from webhook request.
- After signature verification succeeds and a branch→environment match is found,

## [LOCAL] (child_process)

- determine which deployment slot (blue/green) is currently live, deploy the new code into the inactive slot, and start it there.
- Before switching trafic using (Symlink) health-check the server.
- The server must provide a way to manually roll-back a deployment for a given project+environment, by switching live traffic back to the previously active slot, without needing to redeploy or re-pull code.
- Two deployments of same project+enviroment can not be deloyed at same time. lock in Map() by using projectId:enviroment. 2nd deployments will skip with 200 response to webhooks.

### logging/history (status visibility)

- loggin/history will be full event-driven,
- for logging we are using fastify pino.
- for history we are storing into SQlite,

#### SQLite DB Schema

(deployenment) table

- project
- deploment_id
- enviroment
- commit_hash
- deployment_type
- timestamps
- branch
- status : [SUCCESS, FAILED, SKIPPED]

(deployement_logs) table

- deployement_id
- step : [VERIFICATION, CONFIG_LOOKUP, LOCK, HEALTH_CHECK, REALEASE]
- status : [SUCCESS, FAILED]
- err : nullable

## [REMOTE] (SSH)

- for remote deployments the server must connect to the target machine via SSH. it just says "same process like [LOCAL]" but only after the SSH connect step, not before

# Config format.

project:

- repo: <string>
  environments:
  - environment_name: production
    branch: main
    deployment_type: REMOTE
    timeout: <number>
    ...(SSH details go here, only for REMOTE)
    ...(deploy steps go here)
    ...(health check config goes here)
  - environment_name: staging
    branch: staging
    deployment_type: LOCAL
    timeout: <number>
    ...(deploy steps go here)
    ...(health check config goes here)
