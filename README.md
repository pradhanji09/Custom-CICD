# Custom CI/CD Deployment Server

## 1. The one-line pitch

A self-hosted, config-driven CI/CD server (built from scratch in Node.js/Fastify — no Jenkins, no GitHub Actions) that listens for GitHub webhooks and automatically deploys projects to local or remote AWS EC2 servers via SSH, using zero-downtime blue-green deployment with health-check-gated traffic switching and instant rollback.

## 2. The problem it solves

Small teams/solo developers running multiple projects usually deploy code by either:

- Manually SSHing in and running `git pull` + restart (error-prone, doesn't scale, no safety net)
- Using a heavyweight platform (Jenkins, GitHub Actions) — powerful, but overkill to configure for a small/personal setup, and using someone else's tool doesn't demonstrate you understand _how_ CI/CD actually works internally

This project is a lightweight, self-built alternative: drop a YAML config file in, push code, and it deploys itself — safely, with automatic rollback if something's broken — with zero manual server work per deployment.

## 3. What the system actually does, end to end

1. Developer pushes code to a GitHub repo (e.g., to `main` or `staging` branch)
2. GitHub fires a webhook to the CI/CD server
3. Server verifies the webhook genuinely came from GitHub (HMAC-SHA256 signature check against the raw request body)
4. Server matches the repo + branch against a per-project YAML config (which branch maps to which environment — e.g., `main` → production, `staging` → staging)
5. If no match (wrong repo, wrong branch, or a branch-deletion event) → logged and ignored, always responds `200 OK` so GitHub never retries unnecessarily
6. Server acquires a lock (scoped to `project:environment`) so two deployments of the same project+environment can never run concurrently and corrupt each other — a second concurrent trigger is skipped, not queued
7. Server selects a deployment **Strategy** (Local execution via `child_process`, or Remote execution via SSH using `node-ssh`) based on the project's config
8. **Blue-green slot detection**: the target machine has two folders, `node-a` and `node-b`, plus a `pointer` symlink indicating which is currently live. The server reads the symlink, computes the _other_ slot as the deploy target — new code never touches the currently-live slot
9. Deploy steps (defined entirely in YAML config, not hardcoded in the server) run inside the inactive slot: `git fetch`/`checkout`/`reset`, `npm install`, `npm run build`, process restart, so config stays generic across environments
10. A health check (HTTP request with retries/timeout, all config-driven) verifies the newly deployed slot is actually responding correctly
11. **Only if healthy** — the `pointer` symlink is atomically switched (via a "write to temp file, then atomic rename" pattern) to the new slot. The previous slot's process is stopped to save resources
12. If unhealthy — the old slot stays live untouched, the failed deployment is logged, nothing goes down
13. Every deployment attempt, and every step within it, is recorded in SQLite (project, environment, branch, commit hash, status, timestamps, deployed slot, per-step logs) — queryable, auditable history
14. **Rollback**: a manual trigger instantly flips the `pointer` symlink back to whatever slot was live before, and the process is restarted — no rebuild needed, but health check is performed to ensure successful restart
15. Nginx sits in front of both slot ports and is the actual traffic router — it reads which slot is current and forwards real user/GitHub traffic accordingly, reloading without dropping connections

## 4. Tech stack, and the actual reasoning behind each choice

| Choice                                      | Why                                                                                                                                                                                                                                                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node.js**                                 | The language/runtime target for the whole project — direct match to the job requirement being targeted                                                                                                                                                                                         |
| **Fastify** (not Express)                   | Built-in JSON Schema validation was a strong fit for a system that constantly validates untrusted input (GitHub webhooks) and structured config; prior hands-on experience meant time was spent on the hard parts (SSH orchestration, locking, blue-green) instead of learning a new framework |
| **Plain JavaScript** (not TypeScript)       | Deliberately dropped mid-project after TypeScript 7.0 (a brand-new, 5-day-old native rewrite at the time) caused compiler/tooling friction unrelated to the actual CI/CD logic — a pragmatic engineering call to protect time for the parts that mattered                                      |
| **Knex.js** (query builder, not a full ORM) | SQLite in production would be swapped for Postgres if this ever needed multi-instance scaling; Knex made that migration path trivial without committing to heavier ORM machinery the project didn't need                                                                                       |
| **SQLite**                                  | Genuinely sufficient for a single-instance deployment server's history/logs — real self-hosted tools use it for exactly this reason; avoided reaching for Postgres "because it looks better," which would've been an unjustified choice for this scale                                         |
| **YAML** (not JSON) for project config      | Matches the convention of every real CI/CD tool (GitHub Actions, GitLab CI, CircleCI) — human-writable, supports comments, familiar format                                                                                                                                                     |
| **node-ssh**                                | Clean Promise-based wrapper over `ssh2`, used for all remote deployment command execution                                                                                                                                                                                                      |
| **Ajv (JSON Schema)**                       | Unified validation engine across the whole app — the same tool validates Fastify route/webhook payloads, environment variables, and project YAML config, rather than mixing three different validation libraries for conceptually the same job                                                 |
| **AWS EC2, IAM, Security Groups**           | Real infrastructure target — CI/CD server + remote deploy target as separate instances, Security Groups scoped so only the CI/CD server's own SG (not a static IP) is permitted to SSH into the target — a deliberate least-privilege networking decision                                      |
| **Nginx**                                   | The actual traffic-routing layer in front of both blue/green ports — chosen over building a custom reverse proxy so the project demonstrates a standard, real-world production pattern                                                                                                         |

## 5. Design patterns used — and the specific, honest problem each one solves

- **Strategy Pattern** — `LocalDeploymentStrategy` and `SSHDeploymentStrategy` implement the same interface; the rest of the system never needs to know or care which one is in use
- **Factory Pattern** — `deploymentStrategyFactory` picks the correct Strategy based on the project's config, without scattering if/else branching throughout the codebase
- **Singleton** — the Lock Manager and the project Config Registry are each a single, shared instance across the whole app (achieved via Node's module-caching behavior, not a framework-provided DI container)
- **Observer-style event logging** — deployment stages are logged as discrete steps tied to a parent deployment record, enabling full audit trails without tightly coupling the deployment engine to the logging mechanism
- **Manual/explicit dependency injection** — repositories are factory functions that take a `db` connection and close over it, returning an object of methods — a deliberate, hand-built alternative to a framework's automatic DI container, chosen so the mechanism itself could be explained and defended rather than taken for granted

## 6. Real engineering trade-offs made — and why each was defensible, not a shortcut

- **No auto-bootstrapping of fresh blue/green slots** (manual one-time clone per slot chosen over automatic detection) — onboarding a new project requires one manual `git clone` per slot; full auto-bootstrap was scoped out deliberately to keep the deployment engine's logic simpler for v1, with the upgrade path clearly identified
- **No sandboxing of deploy commands** — deploy steps are trusted, self-authored config, not attacker-controlled input, so command-injection isn't the real threat model; the actual risk (human error in config) is mitigated via least-privilege deploy users and version-controlled config files, not a false sense of security from over-engineering a sandbox
- **DB logging schema deliberately excludes successful-step stdout** — captures failure detail (what actually matters for debugging) without the added complexity/storage of full output capture on every successful step

## 7. What "achieved" looks like once AWS deployment is complete

Two EC2 instances: one running the CI/CD server itself (always-on, publicly reachable for GitHub webhooks), one acting as a real remote deployment target (Nginx + blue/green folders + a live deployed app). A real GitHub repository configured with an actual webhook pointing at the live CI/CD server — pushing code to that repo, from any machine, triggers a real, safe, health-checked, zero-downtime deployment, fully autonomously, with the entire event queryable afterward in the deployment history.

## 8. Resume-ready summary (for reuse elsewhere)

**Project title:** Forge — Self-Hosted CI/CD Deployment Server

**One-line resume bullet:**
"Built a self-hosted, config-driven CI/CD server in Node.js/Fastify that automates zero-downtime blue-green deployments (local + remote/SSH) triggered by GitHub webhooks, with health-check-gated traffic switching, instant rollback, and full deployment audit logging — deployed on AWS EC2."

**Talking points for an interview, each backed by something actually built:**

- Designed and implemented blue-green deployment with atomic symlink switching to guarantee zero-downtime releases and instant rollback
- Built HMAC-based GitHub webhook signature verification, including handling the raw-body-vs-parsed-body gotcha in Fastify
- Designed a config-driven deployment engine (YAML-based) supporting multi-branch/multi-environment mapping, so the server's own code never changes when onboarding new projects
- Implemented the Strategy + Factory patterns to cleanly support both local (`child_process`) and remote (SSH via `node-ssh`) deployment targets behind one interface
- Built a concurrency-safe locking mechanism (scoped per project+environment) to prevent race conditions between overlapping deployments
- Unified all input validation (HTTP routes, environment variables, YAML project config) under a single JSON Schema/Ajv-based approach
- Deployed real infrastructure on AWS: EC2 instances, least-privilege Security Groups (SSH restricted by security-group source rather than static IP), and Nginx as the production traffic router
