const axios = require("axios");

const RETRY_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runHealthChecker({ config, port, host }) {
  const {
    endpoint,
    expected_status = 200,
    timeout = 1000,
    retries = 3,
  } = config;

  const url = `http://${host}:${port}${endpoint}`;

  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, { timeout });

      if (response.status === expected_status) {
        return {
          healthy: true,
          attempt,
          url,
        };
      }

      lastError = `Expected status ${expected_status}, got ${response.status}`;
    } catch (err) {
      lastError = err.message;
    }

    console.log(
      `[HEALTH CHECK] attempt ${attempt}/${retries} failed for ${url}: ${lastError}`,
    );

    if (attempt < retries) {
      await sleep(RETRY_MS);
    }
  }

  return {
    healthy: false,
    attempts: retries,
    url,
    error: lastError,
  };
}

module.exports = {
  runHealthChecker,
};
