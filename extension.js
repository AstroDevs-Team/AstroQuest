const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'projects.json');
let projects = [];

// Ensure the database file (JSON) exists before opening it
if (!fs.existsSync(dbPath)) {
    console.error("🚨 Database file missing:", dbPath);
    vscode.window.showErrorMessage("Database file missing! Try reinstalling the extension.");
} else {
    try {
        console.log("🚀 Attempting to load database...");
        projects = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        console.log("✅ Database loaded successfully.");
    } catch (error) {
        console.error("🚨 Error reading database:", error.message);
        vscode.window.showErrorMessage("Database error: " + error.message);
    }
}

/**
 * Fetch a random project idea with optional filtering
 */
function getFilteredIdea(difficulty, type, language) {
    if (!projects.length) {
        vscode.window.showErrorMessage("Database is empty. Please check projects.json.");
        return null;
    }

    let filteredProjects = projects.filter(project =>
        (!difficulty || project.difficulty === difficulty) &&
        (!type || project.type === type) &&
        (!language || project.languages.includes(language))
    );

    if (filteredProjects.length === 0) {
        return null;
    }

    return filteredProjects[Math.floor(Math.random() * filteredProjects.length)];
}

/**
 * Activate the extension
 */
function activate(context) {
    console.log("🚀 AstroQuest Extension is ACTIVATED!");

    let disposable = vscode.commands.registerCommand('astroQuest.getProjectIdea', async () => {
        try {
            if (!projects.length) {
                vscode.window.showErrorMessage("Database not loaded. Try reinstalling the extension.");
                return;
            }

            // Ask user for filtering options
            const difficulty = await vscode.window.showQuickPick(["easy", "intermediate", "hard"], { placeHolder: "Select difficulty level" });
            if (!difficulty) return;

            const type = await vscode.window.showQuickPick(["CLI", "web app", "mobile app", "AI", "API", "desktop app"], { placeHolder: "Select project type" });
            if (!type) return;

            // Fetch available languages dynamically based on the selected difficulty & type
            const availableLanguages = [...new Set(projects
                .filter(p => p.difficulty === difficulty && p.type === type)
                .flatMap(p => p.languages))];

            const language = availableLanguages.length > 0
                ? await vscode.window.showQuickPick(availableLanguages, { placeHolder: "Select programming language (optional)" })
                : null;

            // Fetch a project idea
            const idea = getFilteredIdea(difficulty, type, language);

            if (!idea) {
                vscode.window.showInformationMessage("No projects matched your filters.");
                return;
            }

            vscode.window.showInformationMessage(`💡 ${idea.title}: ${idea.description}`);
        } catch (error) {
            console.error("🚨 Error executing command:", error.message);
            vscode.window.showErrorMessage("Something went wrong. Check the console for details.");
        }
    });

    context.subscriptions.push(disposable);
}

/**
 * Deactivate the extension
 */
function deactivate() {}

module.exports = { activate, deactivate };