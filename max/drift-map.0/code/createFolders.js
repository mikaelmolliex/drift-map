const maxApi = require("max-api");
const fs = require("fs");
const path = require("path");

// message venant de Max
maxApi.addHandler("createProject", (basePath, projectName) => {

    maxApi.post("Création du projet...");

    const projectPath = path.join(basePath, projectName);

    const folders = [
        projectPath,
        path.join(projectPath, "Samples"),
        path.join(projectPath, "Presets"),
        path.join(projectPath, "Data")
    ];

    folders.forEach(folder => {
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
    });

    maxApi.post("Projet créé : " + projectPath);

    // renvoie vers Max
    maxApi.outlet(projectPath);

    // stop le script après exécution
    maxApi.outlet("script", "stop");
    
    
});