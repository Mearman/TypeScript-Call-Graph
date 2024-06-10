#!/usr/bin/env node

import open from 'open';
import express from 'express';
import { config } from 'dotenv';
import { globSync } from 'glob';

// import { convertForArc } from './arc.js';
//import { convertForCascade } from './cascade.js';
import { convertForGraphViz } from './graphviz.js';
// import { convertForMermaid } from './mermaid.js';
import { showHelpMessage, showServerRunning } from './helper';
import * as path from 'path';
import { AnalysisResult, analyzeFiles } from './analyze';

// Load environment variables from .env file
// (namely SRC_PATHS, which is a directory containing .ts files to process)
config();

/**
 * Extract the file paths from the command line arguments and environment variables,
 * and return the ones that are .ts files and not in node_modules
*/
type ProjectFiles = {
    sourceFiles: string[],
    tsConfigFile: string
}
function loadProjectFiles(): ProjectFiles | null{
    const srcPaths = process.env.SRC_PATHS;         // SRC_PATHS=<glob pattern>
    const tsConfigFile = process.env.TS_CONFIG_PATH;
    if(srcPaths && tsConfigFile){
        const sourceFiles = globSync(srcPaths);

        return {
            sourceFiles: sourceFiles.filter(file =>
                file.endsWith('.ts') &&
                !file.includes('node_modules')
            ),
            tsConfigFile
        };
    }

    return null;

}

/**
 * Start Express server with static files and API endpoints
 */
function startServer(analysisResult: AnalysisResult): void {

    const app = express();

    // Serve static files
    const staticPath = 'static';
    app.use(express.static(staticPath));
    ["arc", "cascade", "graphviz", "mermaid", "vendor"].forEach(dir => {
        app.use(`/${dir}`, express.static(path.join(staticPath, dir)));
    });

    // API endpoints
    app.use('/all', function (req, res) { res.json(analysisResult) });
    //app.get('/arcAPI', function (req, res) { res.json(convertForArc(analysisResult)) });
    /*app.get('/cascadeAPI/:startFunc', function (req, res) {
        res.json(convertForCascade(analysisResult))
    });*/
    app.get('/graphvizAPI', function (req, res) { res.json(convertForGraphViz(analysisResult)) });
    //app.get('/mermaidAPI', function (req, res) { res.json(convertForMermaid(functionMap)) });

    app.listen(3000);

    const filePath: string = 'http://localhost:3000';

    showServerRunning(filePath);
    open(filePath);
}


const projectFiles = loadProjectFiles();

if (projectFiles) {
    // TODO: Handle cases where TS_CONFIG_PATH is not defined
    const analysisResult = analyzeFiles(projectFiles.sourceFiles, projectFiles.tsConfigFile)
    startServer(analysisResult);
} else {
    showHelpMessage();
}

