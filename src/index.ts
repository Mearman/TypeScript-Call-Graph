#!/usr/bin/env node

import {openApp} from 'open';
import express from 'express';
import { config } from 'dotenv';
import { globSync } from 'glob';

import { convertForArc } from './arc.js';
import { convertForCascade } from './cascade.js';
import { convertForGraphViz } from './graphviz.js';
import { convertForMermaid } from './mermaid.js';
import { showHelpMessage, showServerRunning } from './helper.js';
import * as path from 'path';
import { analyzeFiles } from './analyze.js';

// Load environment variables from .env file
// (namely SRC_PATHS, which is a directory containing .ts files to process)
config();

/**
 * Extract the file paths from the command line arguments and environment variables,
 * and return the ones that are .ts files and not in node_modules
*/
function loadSourceFiles(): string[] {
    const sourceFiles = process.argv.slice(2);      // "ts-node src/index.ts <file 1> <file 2> ..."
    const srcPaths = process.env.SRC_PATHS;         // SRC_PATHS=<glob pattern>
    if (srcPaths) {
        sourceFiles.push(...globSync(srcPaths));
    }

    return sourceFiles.filter(file =>
        file.endsWith('.ts') &&
        !file.includes('node_modules')
    );
}

/**
 * Start Express server with static files and API endpoints
 */
function startServer(allFunctions: string[], functionMap: Map<string, string[]>): void {

    const app = express();

    // Serve static files
    const staticPath = 'static';
    app.use(express.static(staticPath));
    ["arc", "cascade", "graphviz", "mermaid", "vendor"].forEach(dir => {
        app.use(`/${dir}`, express.static(path.join(staticPath, dir)));
    });

    // API endpoints
    app.use('/all', function (req, res) { res.json(allFunctions) });
    app.get('/arcAPI', function (req, res) { res.json(convertForArc(allFunctions, functionMap)) });
    app.get('/cascadeAPI/:startFunc', function (req, res) {
        res.json(convertForCascade(functionMap, req.params.startFunc))
    });
    app.get('/graphvizAPI', function (req, res) { res.json(convertForGraphViz(functionMap)) });
    app.get('/mermaidAPI', function (req, res) { res.json(convertForMermaid(functionMap)) });

    app.listen(3000);

    const filePath: string = 'http://localhost:3000';

    showServerRunning(filePath);
    openApp(filePath);
}


const sourceFiles = loadSourceFiles();

if (sourceFiles.length) {
    console.log(sourceFiles);
    // TODO: Handle cases where TS_CONFIG_PATH is not defined
    analyzeFiles(sourceFiles, process.env.TS_CONFIG_PATH!)
    // TODO: Uncomment these out later
    // const functions = processFiles(sourceFiles);
    // startServer(functions.all, functions.called);
} else {
    showHelpMessage();
}

