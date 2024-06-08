import * as ts from "typescript";


/** Here, modules represent any of the following units of code:
 * - a file
 * - a class
 * - a function (including arrow functions)
 * - a class constructor or method (including getters and setters)
 * 
 * Modules can contain other modules or call other modules.
 */
export type Module = {
    id: ModuleId,
    node: ts.Node,
    children: Module[],
    calledModules: ModuleId[],
    type: ModuleType,
    name?: string
}
export type ModuleType = 'file' | 'fn' | 'method' | 'class' | 'constructor' | 'getter' | 'setter' | 'static';
export type ModuleId = string & { __moduleId: true };
export type AnalysisResult = {
    rootModules: Module[],
    moduleMap: Map<ModuleId, Module>
}

let nextModuleId = 1;
function createModuleId() {
    return (nextModuleId++).toString() as ModuleId;
}

type NamedDeclaration = ts.Declaration & { name?: ts.PropertyName };

export function analyzeFiles(filenames: string[], tsConfigSrc: string): AnalysisResult {
    const { config } = ts.parseConfigFileTextToJson(tsConfigSrc, ts.sys.readFile(tsConfigSrc)!);
    const program = ts.createProgram({
        rootNames: filenames,
        options: config
    });

    const typeChecker = program.getTypeChecker();

    // maps for bookkeeping
    const moduleMap = new Map<ModuleId, Module>();
    const nodeToModule = new Map<ts.Node, Module>();
    const declarationToModule = new Map<NamedDeclaration, ModuleId>();

    // See if the expression is being assigned to a variable, or is a property of an object
    // Used for arrow functions, etc.
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

    // Follow aliases to get the original symbol
    // This is necessary for dealing with import/export statements
    function followSymbol(symbol: ts.Symbol) {
        while (symbol.flags & ts.SymbolFlags.Alias) {
            symbol = typeChecker.getAliasedSymbol(symbol);
        }
        return symbol;
    }

    /** First pass:
     - create modules for each applicable node
     - store them in a map
     - store the declaration node for the module, if it exists
     - recursively append child modules

     @returns the module for the given node, if it is a module node,
        or an array of child modules if the node is not a module node
     */
    function visit1(node: ts.Node) {

        // if this node is a module, initialize the module object:
        let module: Module | null = null as Module | null;
        function initModule(type: ModuleType, declaration: NamedDeclaration | null, nameOverride?: string) {
            const declarationNameNode = declaration?.name;
            const name = nameOverride || declarationNameNode?.getText();
            const id = createModuleId();
            module = {
                id,
                type,
                children: [],
                calledModules: [],
                node,
                ... (name && { name })
            }

            nodeToModule.set(node, module);
            moduleMap.set(id, module);
            if (declaration)
                declarationToModule.set(declaration, id);
        };

        if (ts.isMethodDeclaration(node)) { initModule('method', node) }
        if (ts.isClassStaticBlockDeclaration(node)) { initModule('fn', null) }
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
            const childResult = visit1(child);
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
    function visit2(node: ts.Node): ModuleId[] {
        const calledModules: ModuleId[] = [];


        // if the visited node is a function call, find the module it's calling
        if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
            const calledSymbol = typeChecker.getSymbolAtLocation(node.expression) || null;
            const originalSymbol = calledSymbol && followSymbol(calledSymbol);
            for (let declaration of originalSymbol?.getDeclarations() || []) {
                let moduleId: ModuleId | null;
                if (moduleId = declarationToModule.get(declaration) || null) {
                    calledModules.push(moduleId);
                    break;
                }
            }
        }

        node.forEachChild(child => {
            const childCallees = visit2(child);
            calledModules.push(...childCallees);
        });

        let module = nodeToModule.get(node);
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
        visit1(sourceFile);
    });

    // Run second pass
    const rootModules = program.getSourceFiles().flatMap(sourceFile => {
        if (sourceFile.fileName.includes('node_modules')) return [];
        visit2(sourceFile);
        return [nodeToModule.get(sourceFile)!];
    });

    return {
        rootModules,
        moduleMap
    };

}
