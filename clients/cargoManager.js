const fs = require("fs");
const path = require("path");
const { TextCache } = require("../src/cache");
const toml = require("toml");
const os = require("os");
const { log } = require("console");

class CargoManager {
  constructor(options) {
    this.targetPath = options.path;
    this.file = options.file;
    this.textcache = new TextCache(path.join(__dirname, "../Licenses"));
  }

  async getDependenciesGraph() {
    return new Promise((resolve, reject) => {
      {
        resolve();
      }
    }).catch();
  }

  setLicensesToDependencies() {
    this.extractCargoDependencies();
  }

  extractCargoDependencies() {
    fs.readFile(path.join(this.targetPath, this.file), "utf8", (err, data) => {
      if (err) {
        console.error("Error reading file:", err);
        return;
      }

      try {
        const parsed = toml.parse(data);
        const packageReferences = [];

        if (parsed.dependencies) {
          Object.keys(parsed.dependencies).forEach((key) => {
            const version = parsed.dependencies[key];
            packageReferences.push({ include: key, version: version });
          });
        }

        if (parsed["dev-dependencies"]) {
          Object.keys(parsed["dev-dependencies"]).forEach((key) => {
            const version = parsed["dev-dependencies"][key];
            packageReferences.push({ include: key, version: version });
          });
        }

        if (parsed.target) {
          Object.keys(parsed.target).forEach((targetKey) => {
            if (parsed.target[targetKey].dependencies) {
              Object.keys(parsed.target[targetKey].dependencies).forEach(
                (key) => {
                  const version = parsed.target[targetKey].dependencies[key];
                  packageReferences.push({ include: key, version: version });
                }
              );
            }
          });
        }
        this.findCargoLicenses(packageReferences);
      } catch (err) {
        console.error("Error parsing TOML:", err);
      }
    });
  }

  findCargoLicenses(packageReferences) {
    const cargoPath = path.join(os.homedir(), ".cargo", "registry", "src");

    const readPackageContents = (packagePath, pkg) => {
      fs.readdir(packagePath, (err, files) => {
        if (err) {
          console.error("Error reading package contents:", err);
          return;
        }

        const licenseFiles = files.filter((file) =>
          /^LICENSE(\.|-|_|$)|^license(\.|-|_|$)/i.test(file)
        );

        licenseFiles.forEach(async (file) => {
          const filePath = path.join(packagePath, file);
          let license = {
            name: pkg.include,
            ...(await this.textcache.compareText(pkg.include, filePath)),
          };
          console.log(license);
        });

        if (licenseFiles.length === 0) {
          const versionStr =
            typeof pkg.version === "string"
              ? pkg.version
              : JSON.stringify(pkg.version);
          console.log(
            `No license files found for ${pkg.include}-${versionStr}`
          );
        }
      });
    };

    packageReferences.forEach((pkg) => {
      const packageBasePath = path.join(
        cargoPath,
        `${pkg.include.toLowerCase()}-`
      );

      const subDirs = fs
        .readdirSync(cargoPath)
        .filter((dir) => dir.includes("index.crates.io-"));
      if (subDirs.length === 0) {
        console.error(`Cargo registry subdirectory not found`);
        return;
      }

      const registryPath = path.join(cargoPath, subDirs[0]);

      const versions = fs
        .readdirSync(registryPath)
        .filter((dir) => dir.startsWith(`${pkg.include.toLowerCase()}-`));
      if (versions.length === 0) {
        console.error(`Package not found: ${pkg.include}`);
        return;
      }

      versions.sort((a, b) => {
        const versionA = a.match(/-(\d+\.\d+\.\d+(?:\+\w+\.\d+\.\d+)?)/);
        const versionB = b.match(/-(\d+\.\d+\.\d+(?:\+\w+\.\d+\.\d+)?)/);

        if (versionA && versionB) {
          return versionA[1].localeCompare(versionB[1], undefined, {
            numeric: true,
          });
        }
        return 0;
      });

      const highestVersion = versions[versions.length - 1];
      const packagePath = path.join(registryPath, highestVersion);

      fs.access(packagePath, fs.constants.F_OK, (err) => {
        if (err) {
          console.error(`Package not found: ${pkg.include} ${pkg.version}`);
          return;
        }
        readPackageContents(packagePath, pkg);
      });
    });
  }
}

module.exports = {
  CargoManager,
};
