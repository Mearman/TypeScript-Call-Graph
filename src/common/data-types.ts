import ts from "typescript";
import { mapToRecord } from "./util.js";
import { AppRouter } from "../server/trpc-router.js";

/** Here, modules represent any of the following units of code:
 * - a file
 * - a class
 * - a function (including arrow functions)
 * - a class constructor or method (including getters and setters)
 *
 * Modules can contain other modules or call other modules.
 */
export type Module = {
    id: ModuleId;
    children: Module[];
    calledModules: ModuleId[];
    type: ModuleType;
    name?: string;
};
export type ModuleType = 'file' | 'fn' | 'class' | 'constructor' | 'getter' | 'setter' | 'method' | 'static';
export type ModuleId = string & { __moduleId: true; };

export type CallGraph = {
    moduleMap: Record<ModuleId, Module>;
    rootModules: Module[];
}
export type AnalysisResult = {
    rootModules: Module[];
    moduleMap: Map<ModuleId, Module>;
    nodeMap: Map<ModuleId, ts.Node>;
};

export function getGraphFromAnalysisResult(analysisResult: AnalysisResult): CallGraph {
    return {
        moduleMap: mapToRecord(analysisResult.moduleMap),
        rootModules: analysisResult.rootModules
    };
}

export { AppRouter };