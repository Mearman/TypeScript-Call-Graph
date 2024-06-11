import * as path from 'path';
import { analyzeFiles } from '../src/server/logic/analyze.js';
import { describe, expect, test } from 'vitest';

describe('analyzeFiles', () => {
    const testCodeDir = path.join(__dirname, 'test-code');
    function testFile(relativePath: string): string {
        return path.join(testCodeDir, relativePath);
    }

    test('can resolve function module from call expression', () => {
        const { rootModules, moduleMap } = analyzeFiles([testFile('01-function-resolution.ts')], testFile('tsconfig.json'));
        expect(rootModules.length).toBe(1);
        const [file] = rootModules;
        expect(file.type).toBe('file');
        expect(file.children.length).toBe(2);
        expect(file.calledModules).toContain(file.children[1].id);
    });

    test('can resolve function module from property access expression', () => {
        const { rootModules, moduleMap } = analyzeFiles([testFile('02-property-resolution.ts')], testFile('tsconfig.json'));
        expect(rootModules.length).toBe(1);
        const [file] = rootModules;
        expect(file.type).toBe('file');
        expect(file.children.length).toBe(2);
        const [a, b] = file.children;
        expect(b.calledModules).toContain(a.id);
    });

    test('can resolve functions from imports', () => {
        const { rootModules, moduleMap } = analyzeFiles([
            testFile('02-property-resolution.ts'),
            testFile('03-import-resolution.ts'),
        ], testFile('tsconfig.json'));

        const [exportFile, importFile] = rootModules;
        const [_, b] = exportFile.children;

        expect(importFile.calledModules).toContain(b.id);
    });

    test('can resolve methods in classes', () => {
        const { rootModules, moduleMap } = analyzeFiles([testFile('04-methods.ts')], testFile('tsconfig.json'));
        const file = rootModules[0];
        const dogClass = file.children[0];
        expect(dogClass.name).toEqual('Dog');
        const [constructor, static_, bark, getX, setX] = dogClass.children;

        expect(constructor.type).toEqual('constructor');
        expect(static_.type).toEqual('static');
        expect(bark.type).toEqual('method');
        expect(getX.type).toEqual('getter');
        expect(setX.type).toEqual('setter');

        expect(file.calledModules).toEqual([
            constructor.id,
            getX.id,
            bark.id,
            setX.id
        ]);
    });

    test('anonymous functions, assignment, and parenthesis', () => {
        const { rootModules, moduleMap } = analyzeFiles([testFile('05-anonymous.ts')], testFile('tsconfig.json'));
        const file = rootModules[0];
        const x = file.children[0];
        const y = file.children[1];

        expect(file.calledModules).toContain(x.id);
        expect(file.calledModules).toContain(y.id);

    });
})