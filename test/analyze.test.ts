import { analyzeFiles } from '@/analyze';
import { describe, expect, test } from '@jest/globals';
import * as path from 'path';

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
})