const path = require("path");
const fs = require("fs");
const yaml = require("js-yaml");
const ajv = require("../commons/validator");
const projectConfigSchema = require("../commons/schema/projectConfigSchema");

const validateProjectConfig = ajv.compile(projectConfigSchema);

class ConfigRegistry {
  #projectsConfig;
  constructor() {
    this.#projectsConfig = new Map();
    this.#setProjectConfig();
  }

  #setProjectConfig() {
    const projectFolder = path.resolve(__dirname, "..", "..", "projects");
    const allFiles = fs.readdirSync(projectFolder);

    allFiles.forEach((file) => {
      if (file.endsWith(".yaml") || file.endsWith(".yml")) {
        const data = yaml.load(
          fs.readFileSync(path.join(projectFolder, file), "utf8"),
        );

        const isValid = validateProjectConfig(data);
        if (!isValid) {
          console.error(JSON.stringify(validateProjectConfig.errors, null, 2));
          throw Error(`Invalid project config in ${file}`);
        }

        this.#projectsConfig.set(data.repo, data);
        console.log(`Registered project: ${data.repo} from file: ${file}`);
      }
    });
  }

  getProjectConfig(name) {
    return this.#projectsConfig.get(name);
  }
}

const configRegistry = new ConfigRegistry();
module.exports = configRegistry;
