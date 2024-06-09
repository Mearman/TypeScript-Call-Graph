import * as graphviz from 'graphviz';
import { AnalysisResult, Module } from './analyze';


// todo: make sure that when you edge to a module with children, you 
// go to the invisible node instead of the module subgraph

function getModuleNodeId(module: Module) {
    if (module.children.length === 0)
        return module.id;
    else
        return module.id + "_invisible";
}

export function convertForGraphViz(analysisResult: AnalysisResult) {

    const { rootModules, moduleMap } = analysisResult;

    function createModule(module: Module, g: graphviz.Graph) {
        const moduleNodeId = getModuleNodeId(module);
        if (module.children.length === 0) {
            g.addNode(moduleNodeId, {
                label: module.name,
                shape: 'circle',
                style: 'filled',
                fillcolor: 'lightblue',
                fontname: 'Arial',
                fontsize: 12,
            });
        } else {
            const cluster = g.addCluster(module.id);
            for (let child of module.children) {
                createModule(child, cluster);
            }
            cluster.addNode(moduleNodeId, {
                style: 'invis',
                label: ''
            });
            cluster.set("label", module.name || "");
            cluster.set("color", "blue");
        }

        for (let calledModule of module.calledModules) {
            const calledModuleNodeId = getModuleNodeId(moduleMap.get(calledModule)!);
            g.addEdge(moduleNodeId, calledModuleNodeId);
        }
    }

    // initialize the graph
    const g = graphviz.digraph("G");
    g.set("rankdir", "LR");

    g.setNodeAttribut("style", "filled");
    g.setNodeAttribut("color", "white");

    for (let module of rootModules) {
        createModule(module, g);
    }

    return g.to_dot();
}
