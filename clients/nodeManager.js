const { rejects } = require("assert");
const { exec, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { TextCache } = require("../src/cache");

class NodeManager {
  configFile = "package.json";
  packagesFolder = "node_modules";
  isLocalInstalled = true;
  dependecyGraph = {};

  constructor(options) {
    this.targetPath = options.path;
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
    let licenseInfo = {};
    const that = this;
    return new Promise((resolve, reject) => {
      const fetchLicense = () => {
        const nodeModulesPath = path.join(this.targetPath, "node_modules");

        if (!fs.existsSync(nodeModulesPath)) {
          console.log(`"${nodeModulesPath}" Folder not found.`);
          return;
        }

        const searchForLicense = (folderPath) => {
          const licenseFiles = ["LICENSE", "LICENSE.txt", "licenses"];
          let licenseFound = false;
          let pckName = folderPath.split("\\");
          pckName = pckName[pckName.length - 1];
          licenseFiles.forEach(async (file) => {
            const filePath = path.join(folderPath, file);
            if (fs.existsSync(filePath)) {
              //console.log(`Find: ${filePath}`);
              let license = await this.textcache.compareText(pckName, filePath);
              console.log({ name: pckName, license });
              licenseFound = true;
            }
          });

          return licenseFound;
        };

        fs.readdir(nodeModulesPath, (err, folders) => {
          if (err) {
            console.error(`Error: ${err.message}`);
            return;
          }

          folders.forEach((folder) => {
            const folderPath = path.join(nodeModulesPath, folder);

            if (fs.lstatSync(folderPath).isDirectory()) {
              let licenseFound = searchForLicense(folderPath);

              if (!licenseFound) {
                fs.readdir(folderPath, (err, subFolders) => {
                  if (err) {
                    console.error(`Error: ${err.message}`);
                    return;
                  }

                  subFolders.forEach((subFolder) => {
                    const subFolderPath = path.join(folderPath, subFolder);
                    if (fs.lstatSync(subFolderPath).isDirectory()) {
                      searchForLicense(subFolderPath);
                    }
                  });
                });
              }
            }
          });
        });
      };
      fetchLicense();
      console.log(licenseInfo);
    });
  }
}

module.exports = {
  NodeManager,
};
