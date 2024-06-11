#!/usr/bin/env node
import open from 'open';
import dotenv from 'dotenv';
import { globSync } from 'glob';

import { showHelpMessage, showServerRunning } from './helper';
import { analyzeFiles } from './logic/analyze';
import { createHybridServer } from './server-setup-utils';
import staticFilesConfig from '../../static-files.config';
import { appRouter } from './trpc-router';
import { AnalysisResult, getGraphFromAnalysisResult } from '../common/data-types';


// Load environment variables from .env file
dotenv.config();

type ProjectFiles = {
    sourceFiles: string[],
    tsConfigFile: string
}

/**
 * Extract the file paths from the command line arguments and environment variables,
 * and return the ones that are .ts files and not in node_modules
*/
function loadProjectFiles(): ProjectFiles | null {
    const srcPaths = process.env.SRC_PATHS;         // SRC_PATHS=<glob pattern>
    const tsConfigFile = process.env.TS_CONFIG_PATH;
    if (srcPaths && tsConfigFile) {
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
 * Start the server
 */
async function startServer(analysisResult: AnalysisResult, mode: 'dev' | 'production'): Promise<void> {

    const callGraph = getGraphFromAnalysisResult(analysisResult);
    const server = await createHybridServer(staticFilesConfig, mode);
    server.useTRPCRouter(appRouter, { callGraph });
    server.listen(3000);


    const filePath: string = 'http://localhost:3000';
    showServerRunning(filePath);
    open(filePath);
}


// Entry point
const projectFiles = loadProjectFiles();

if (projectFiles) {
    const analysisResult = analyzeFiles(projectFiles.sourceFiles, projectFiles.tsConfigFile)
    await startServer(analysisResult, process.env.NODE_ENV === 'production' ? 'production' : 'dev');
} else {
    showHelpMessage();
}

