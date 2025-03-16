const vscode = require('vscode');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

// Open SQLite database
try {
    const dbPath = path.resolve(__dirname, 'projects.db');
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error("🚨 Error opening database:", err.message);
            db = null;
        } else {
            console.log("✅ Database connected successfully.");
        }
    });
} catch (error) {
    console.error("🚨 Critical error opening database:", error.message);
    db = null;
}

/**
 * Fetch available programming languages and tags based on selected difficulty and project type
 */
function getFilteredOptions(difficulty, type, callback) {
    if (!db) {
        vscode.window.showErrorMessage("Database connection failed. Please check projects.db.");
        return callback(null, null);
    }

    let queryLanguages = `
        SELECT DISTINCT Languages.name FROM Languages
        JOIN ProjectLanguages ON Languages.id = ProjectLanguages.language_id
        JOIN Projects ON ProjectLanguages.project_id = Projects.id
        JOIN Difficulty ON Projects.difficulty_id = Difficulty.id
        JOIN Types ON Projects.type_id = Types.id
        WHERE Difficulty.name = ? AND Types.name = ?
    `;

    let queryTags = `
        SELECT DISTINCT Tags.name FROM Tags
        JOIN ProjectTags ON Tags.id = ProjectTags.tag_id
        JOIN Projects ON ProjectTags.project_id = Projects.id
        JOIN Difficulty ON Projects.difficulty_id = Difficulty.id
        JOIN Types ON Projects.type_id = Types.id
        WHERE Difficulty.name = ? AND Types.name = ?
    `;

    db.all(queryLanguages, [difficulty, type], (err, languageRows) => {
        if (err) {
            console.error("🚨 Error fetching languages:", err.message);
            return callback(null, null);
        }

        db.all(queryTags, [difficulty, type], (err, tagRows) => {
            if (err) {
                console.error("🚨 Error fetching tags:", err.message);
                return callback(null, null);
            }

            const languages = languageRows.map(row => row.name);
            const tags = tagRows.map(row => row.name);
            callback(languages, tags);
        });
    });
}

/**
 * Fetch a random project idea with selected filters
 */
function getFilteredIdea(difficulty, type, language, tag, callback) {
    if (!db) {
        vscode.window.showErrorMessage("Database connection failed. Please check projects.db.");
        return callback(null);
    }

    let query = `
        SELECT Projects.title, Projects.description 
        FROM Projects
        JOIN Difficulty ON Projects.difficulty_id = Difficulty.id
        JOIN Types ON Projects.type_id = Types.id
        LEFT JOIN ProjectLanguages ON Projects.id = ProjectLanguages.project_id
        LEFT JOIN Languages ON ProjectLanguages.language_id = Languages.id
        LEFT JOIN ProjectTags ON Projects.id = ProjectTags.project_id
        LEFT JOIN Tags ON ProjectTags.tag_id = Tags.id
        WHERE Difficulty.name = ? AND Types.name = ?
    `;
    const params = [difficulty, type];

    if (language) {
        query += " AND (Languages.name = ? OR Languages.name = 'general')";
        params.push(language);
    }
    if (tag) {
        query += " AND Tags.name = ?";
        params.push(tag);
    }

    query += " ORDER BY RANDOM() LIMIT 1";

    db.get(query, params, (err, row) => {
        if (err) {
            console.error("🚨 Error fetching project idea:", err.message);
            return callback(null);
        }
        callback(row);
    });
}

/**
 * Activate the extension
 */
function activate(context) {
    console.log("🚀 AstroQuest Extension is ACTIVATED!");

    let disposable = vscode.commands.registerCommand('astroQuest.getProjectIdea', async () => {
        try {
            if (!db) {
                vscode.window.showErrorMessage("Database not loaded. Try restarting VS Code.");
                return;
            }

            const difficulty = await vscode.window.showQuickPick(["easy", "intermediate", "hard"], { placeHolder: "Select difficulty level" });
            if (!difficulty) return;

            const type = await vscode.window.showQuickPick(["CLI", "web app", "mobile app", "AI", "API", "desktop app"], { placeHolder: "Select project type" });
            if (!type) return;

            // Fetch available languages & tags based on difficulty & type
            getFilteredOptions(difficulty, type, async (languages, tags) => {
                if (!languages || !tags) {
                    vscode.window.showErrorMessage("No matching projects found.");
                    return;
                }

                const language = await vscode.window.showQuickPick(languages, { placeHolder: "Select a programming language" });
                const tag = await vscode.window.showQuickPick(tags, { placeHolder: "Select a project tag" });

                getFilteredIdea(difficulty, type, language, tag, (idea) => {
                    if (!idea) {
                        vscode.window.showInformationMessage("No projects matched your filters.");
                        return;
                    }

                    vscode.window.showInformationMessage(`💡 ${idea.title}: ${idea.description}`);
                });
            });

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
function deactivate() {
    try {
        if (db) db.close();
    } catch (error) {
        console.error("🚨 Error closing database:", error.message);
    }
}

module.exports = { activate, deactivate };
