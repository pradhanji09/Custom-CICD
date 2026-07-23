const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

module.exports = {
  client: "sqlite3",
  connection: {
    filename: path.join(PROJECT_ROOT, process.env.DB_FILE_PATH),
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(PROJECT_ROOT, "migrations"),
  },
};
