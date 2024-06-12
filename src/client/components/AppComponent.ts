import { CallGraph, Module, ModuleId } from "../../common/data-types";
import Component from "./Component";
import { elem } from "./element-util";
import cytoscape, { CytoscapeOptions } from 'cytoscape';
import fcose from 'cytoscape-fcose';

cytoscape.use(fcose);
export class AppComponent extends Component {
    private cy!: cytoscape.Core;

    constructor() {
        super(elem('div', {
            s: {
                width: "100vw",
                height: "100vh"
            }
        }));

    }

    /** Call this after appending the element */
    ready() {
        this.cy = cytoscape({
            container: this.element,
            elements: [
            ],
            layout: {
                name: 'fcose'
            },
            style: [
                {
                    selector: 'node',
                    style: {
                        'label': 'data(name)',
                        'text-wrap': 'wrap',
                    }
                },
                {
                    selector: 'edge',
                    style: {
                        'curve-style': 'bezier',
                        'target-arrow-shape': 'triangle'
                    }
                }
            ]
        });
    }

    setCallGraph(callGraph: CallGraph) {
        const { moduleMap, rootModules } = callGraph;

        this.cy.remove(this.cy.elements());

        // keep track of edges to add
        const edges: cytoscape.ElementDefinition[] = [];

        // add nodes
        const visit = (module: Module, parent: ModuleId | null) => {
            this.cy.add({
                data: {
                    id: module.id as string,
                    parent: parent || undefined,
                    name: module.name
                },
            });

            for (const calledModuleId of module.calledModules) {
                edges.push({
                    data: {
                        id: `${module.id}-${calledModuleId}`,
                        source: module.id as string,
                        target: calledModuleId,
                    }
                });
            }

            for (let child of module.children) {
                visit(child, module.id);
            }
        }

        // visit
        for (const rootModule of rootModules) {
            visit(rootModule, null);
        }

        // add edges
        this.cy.add(edges);

        // lay them out nicely
        this.cy.layout({
            name: 'fcose',

        }).run();

    }

}