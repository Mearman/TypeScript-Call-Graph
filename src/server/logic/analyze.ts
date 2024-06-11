import { AnalysisResult, Module, ModuleId, ModuleType } from "../../common/data-types.js";
import ts from "typescript";


let nextModuleId = 1;
function createModuleId() {
    return (nextModuleId++).toString() as ModuleId;
}

type NamedDeclaration = ts.Declaration & { name?: ts.PropertyName };

// brand types for nodes
type NodeId = string & { __nodeId: true }
type NamedDeclarationId = NodeId & { __namedDeclarationId: true }

function getNodeId(node: ts.Node, fileName?: string): NodeId {
    if (!fileName)
        fileName = node.getSourceFile().fileName;
    const { pos, end } = node;
    return `${fileName}:${pos}:${end}` as NodeId;
}

function getNamedDeclarationId(node: NamedDeclaration, fileName?: string): NamedDeclarationId {
    return getNodeId(node, fileName) as NamedDeclarationId;
}

/** 
 * Check if the given node is being assigned to
 */
function isAssignee(node: ts.Node) {
    while (true) {
        const parent = node.parent;
        if (ts.isBinaryExpression(parent)
            && parent.operatorToken.kind == ts.SyntaxKind.EqualsToken
            && node == parent.left) {
            return true;
        }
        if (ts.isArrayLiteralExpression(parent)) {
            node = parent;
            continue;
        }
        return false;
    }
}

/**
 * Analyze the given files to get the call graph data
 */
export function analyzeFiles(filenames: string[], tsConfigSrc: string): AnalysisResult {

    // create program & type checker with the given files and tsconfig
    const { config } = ts.parseConfigFileTextToJson(tsConfigSrc, ts.sys.readFile(tsConfigSrc)!);
    const program = ts.createProgram({
        rootNames: filenames,
        options: config
    });
    const typeChecker = program.getTypeChecker();

    // maps for bookkeeping
    const moduleMap = new Map<ModuleId, Module>();
    const nodeToModule = new Map<NodeId, Module>();
    const declarationToModule = new Map<NamedDeclarationId, Module>();
    const constructorMap = new Map<ModuleId, Module>(); // class -> constructor
    const moduleToNode = new Map<ModuleId, ts.Node>();

    /** Find the node that names the given expression, if it exists */
    function getDeclarationFromContext(expression: ts.Node): NamedDeclaration | null {

        const parent = expression.parent;

        // class MyClass {x: ()=>{ ... }}
        if (ts.isPropertyDeclaration(parent)) {
            return parent;
        }

        // const x = (()=>{ ... }}) */
        if (ts.isParenthesizedExpression(parent)) {
            return getDeclarationFromContext(parent);
        }

        // const x = ()=>{ ... }
        if (ts.isVariableDeclaration(parent)) {
            if (parent.name.kind === ts.SyntaxKind.Identifier) {
                return { ...parent, name: parent.name };
            }
        }

        // const fnMap = {x: ()=>{ ... }}
        if (ts.isPropertyAssignment(parent)) {
            return parent;
        }

        return null;
    }

    /**
     * Follow aliases to get the original symbol
     * This is necessary for dealing with import/export statements
     */
    function followSymbol(symbol: ts.Symbol) {
        while (symbol.flags & ts.SymbolFlags.Alias) {
            symbol = typeChecker.getAliasedSymbol(symbol);
        }
        return symbol;
    }

    /**
     * Generator for a node's declarations
     */
    function* getDeclarations(node: ts.Node): Generator<ts.Declaration> {
        const calledSymbol = typeChecker.getSymbolAtLocation(node) || null;
        const originalSymbol = calledSymbol && followSymbol(calledSymbol);
        for (let declaration of originalSymbol?.getDeclarations() || []) {
            yield declaration;
        }
    }

    /** First pass: recursively visit each node in the AST, and create
     *  entries in the maps.
     * 
     * @returns the module for the given node, if it is a module node,
     *   or an array of child modules if the node is not a module node
     */
    function visit1(node: ts.Node, fileName: string) {

        // if this node is a module, initialize the module object
        let module: Module | null = null as Module | null;
        function initModule(type: ModuleType, declaration: NamedDeclaration | null, nameOverride?: string) {
            const declarationNameNode = declaration?.name;
            const name = nameOverride || declarationNameNode?.getText();
            const moduleId = createModuleId();
            const nodeId = getNodeId(node, fileName);
            module = {
                id: moduleId,
                type,
                children: [],
                calledModules: [],
                ... (name && { name })
            }

            // store the module info in the maps

            nodeToModule.set(nodeId, module);
            moduleMap.set(moduleId, module);
            moduleToNode.set(moduleId, node);
            if (declaration) {
                const declarationId = getNamedDeclarationId(declaration, fileName);
                declarationToModule.set(declarationId, module);
            }

            // if this node is a constructor, map the class module to it
            if (type == 'constructor') {
                if (ts.isClassDeclaration(node.parent)) {
                    const classModule = nodeToModule.get(getNodeId(node.parent, fileName));
                    if (classModule) {
                        constructorMap.set(classModule.id, module);
                    }

                }
            }
        };

        if (ts.isMethodDeclaration(node)) { initModule('method', node) }
        if (ts.isClassStaticBlockDeclaration(node)) { initModule('static', null) }
        if (ts.isConstructorDeclaration(node)) { initModule('constructor', node) }
        if (ts.isGetAccessorDeclaration(node)) { initModule('getter', node) }
        if (ts.isSetAccessorDeclaration(node)) { initModule('setter', node) }
        if (ts.isFunctionExpression(node)) { initModule('fn', getDeclarationFromContext(node)) }
        if (ts.isArrowFunction(node)) { initModule('fn', getDeclarationFromContext(node)) }
        if (ts.isClassExpression(node)) { initModule('class', getDeclarationFromContext(node)) }
        if (ts.isFunctionDeclaration(node)) { initModule('fn', node) }
        if (ts.isClassDeclaration(node)) { initModule('class', node) }
        if (ts.isSourceFile(node)) { initModule('file', null, node.fileName) }

        // recursively append child modules
        const children: Module[] = [];
        node.forEachChild(child => {
            const childResult = visit1(child, fileName);
            if (childResult instanceof Array) {
                const childModules = childResult;
                children.push(...childModules);
            } else {
                children.push(childResult);
            }
        });

        if (module) {
            module.children = children;
            return module;
        } else {
            return children;
        }

    }

    /**
     * Second pass: find all called modules
     * @returns Modules that are called by the given node or its children, excluding
     * calls made in nested modules.
     * For example:
     * ```
     * function a(){
     *   function b(){ c(); }
     *   d();
     * }
     * ```
     * When the node for 'a' is visited, only the module id for 'd' should be returned.
     */
    function visit2(node: ts.Node, fileName: string): ModuleId[] {
        const calledModules: ModuleId[] = [];

        // calling a function
        if (ts.isCallExpression(node)) {
            for (const declaration of getDeclarations(node.expression)) {
                let module: Module | null;
                if (module = declarationToModule.get(getNamedDeclarationId(declaration)) || null) {
                    calledModules.push(module.id);
                    break;
                }
            }
        }

        // calling a getter or setter
        if (ts.isPropertyAccessExpression(node)) {
            const nodeIsLValue = isAssignee(node);
            for (const declaration of getDeclarations(node.name)) {
                let module: Module | null;
                if ((module = declarationToModule.get(getNamedDeclarationId(declaration)) || null)
                    && (module.type == 'getter' && !nodeIsLValue
                        || module.type == 'setter' && nodeIsLValue)
                ) {
                    calledModules.push(module.id);
                    break;
                }
            }
        }

        // calling a constructor
        if (ts.isNewExpression(node)) {
            for (const declaration of getDeclarations(node.expression)) {
                let classModule: Module | undefined;
                if (classModule = declarationToModule.get(getNamedDeclarationId(declaration))) {
                    let constructorModule: Module | undefined;
                    if (constructorModule = constructorMap.get(classModule.id)) {
                        calledModules.push(constructorModule.id);
                    }
                    break;
                }
            }
        }

        node.forEachChild(child => {
            const childCallees = visit2(child, fileName);
            calledModules.push(...childCallees);
        });

        let module = nodeToModule.get(getNodeId(node, fileName));
        if (module) {
            module.calledModules = calledModules;
            return [];
        } else {
            return calledModules;
        }

    }

    // Run first pass
    program.getSourceFiles().forEach(sourceFile => {
        if (sourceFile.fileName.includes('node_modules')) return;
        visit1(sourceFile, sourceFile.fileName);
    });

    // Run second pass
    const rootModules = program.getSourceFiles().flatMap(sourceFile => {
        if (sourceFile.fileName.includes('node_modules')) return [];
        visit2(sourceFile, sourceFile.fileName);
        return [nodeToModule.get(getNodeId(sourceFile, sourceFile.fileName))!];
    });

    return {
        rootModules,
        moduleMap,
        nodeMap: moduleToNode
    };

}
