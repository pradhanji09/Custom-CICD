# Forge: Self-Hosted CI/CD Deployment Server

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=flat-square&logo=fastify&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-232F3E?style=flat-square&logo=amazon-aws&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

> **A lightweight, self-hosted, config-driven CI/CD server that automates zero-downtime blue-green deployments via GitHub webhooks.**

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [Architecture & Workflow](#architecture--workflow)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Configuration](#configuration)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Overview

Forge is a self-hosted alternative to heavyweight platforms like Jenkins or GitHub Actions, designed specifically for small teams and solo developers. By dropping a single YAML configuration file into your project, Forge listens for GitHub webhooks and automatically deploys your code safely.

It handles local or remote (AWS EC2 via SSH) execution, utilizes a zero-downtime blue-green deployment strategy, gates traffic switching behind health checks, and supports instant rollback—all without requiring manual server intervention per deployment.

## Core Features

- **Zero-Downtime Blue-Green Deployments:** Safely deploys new code to an inactive slot and atomically switches the `pointer` symlink only after a successful health check.
- **Config-Driven Engine (YAML):** Define your environments, branches, and deployment steps in a declarative YAML file. The server's codebase remains untouched when onboarding new projects.
- **Local & Remote Execution:** Supports deploying directly on the server itself or orchestrating deployments to remote EC2 instances via SSH using the Strategy and Factory design patterns.
- **Concurrency-Safe Locking:** Prevents race conditions by locking deployments scoped to a specific project and environment. Overlapping webhook triggers are safely skipped.
- **Secure Webhooks:** Implements strict HMAC-SHA256 signature verification to ensure payloads genuinely originate from GitHub.
- **Comprehensive Audit Logging:** Records every deployment attempt, step, status, and log output into a SQLite database for complete traceability.
- **Instant Rollback:** Manually trigger a rollback to instantly revert the `pointer` symlink to the previously stable slot.

## Architecture & Workflow

1. **Trigger:** Developer pushes code to GitHub. GitHub sends a webhook payload to Forge.
2. **Verification & Matching:** Forge verifies the HMAC signature, matches the repository and branch against the YAML config, and acquires a concurrency lock.
3. **Execution:** Forge uses either a `LocalDeploymentStrategy` or `SSHDeploymentStrategy`. It identifies the inactive blue-green slot (e.g., `node-b` if `node-a` is live).
4. **Build & Test:** Runs user-defined YAML steps (e.g., `git fetch`, `npm install`, `npm run build`) in the inactive slot.
5. **Health Check:** Sends an HTTP request with retries to the newly deployed slot.
6. **Traffic Switch:** If healthy, atomically updates the `pointer` symlink and stops the old slot. Nginx routes incoming traffic based on this pointer. If unhealthy, the deployment fails gracefully without affecting the live application.

## Tech Stack

- **Runtime & Framework:** Node.js, Fastify
- **Database & Query Builder:** SQLite, Knex.js
- **Validation:** Ajv (JSON Schema)
- **Deployment & Networking:** node-ssh, AWS EC2, Nginx
- **Configuration:** YAML

## Getting Started

### Prerequisites

- **Node.js** (v18.0.0 or higher)
- **Nginx** (for traffic routing)
- **Git** installed on the deployment target
- An **AWS EC2** instance (optional, if deploying remotely)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/pradhanji09/Custom-CICD.git
   cd Custom-CICD
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Initialize the SQLite database:**

   ```bash
   npm run db:migrate
   ```

4. **Start the server:**
   ```bash
   npm run start:dev
   ```

### Environment Variables

Create a `.env` file in the root directory and configure your secrets safely:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# GitHub Webhook Settings
GITHUB_WEBHOOK_SECRET=your_hmac_secret_here

# Database
DB_FILE_PATH=./data/forge.sqlite
```

## Configuration

Forge uses a unified YAML configuration for projects. Create a `project.yml` file to map branches to environments and define steps:

```yaml
name: my-web-app
repo: username/my-web-app
environments:
  production:
    branch: main
    strategy: local
    blueGreen:
      slots: [/var/www/node-a, /var/www/node-b]
      pointer: /var/www/current
    healthCheck:
      url: http://localhost:8080/health
      timeoutSeconds: 30
    steps:
      - git fetch origin main
      - git reset --hard origin/main
      - npm ci
      - npm run build
      - pm2 restart web-app
```

## Usage

Once running and configured:

1. Ensure your Nginx server is configured to serve the directory pointed to by your blue-green `pointer` symlink.
2. Add your server's webhook URL (e.g., `http://your-ci-server.com/webhooks/github`) to your repository on GitHub.
3. Push code to the configured branch. Forge will automatically capture the webhook, run your build steps in the inactive slot, and seamlessly switch traffic!

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.
