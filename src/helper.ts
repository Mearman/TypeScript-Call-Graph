import kleur from 'kleur';
const { green, bold } = kleur;

/**
 * Shown when user runs `tcg` without arguments
 */
export function showHelpMessage(): void {
    console.log(green('╭───────────────────────────╮'));
    console.log(green('│                           │'));
    console.log(green('│   ') + 'Typescript Call Graph' + green('   │'));
    console.log(green('│                           │'));
    console.log(green('╰───────────────────────────╯'));

    console.log('Please provide a list of input files and/or folders');
    console.log('e.g. `'
        + green('myFile.ts') + '`, `'
        + green('*') + '`, `'
        + green('**/*') + '`, `'
        + green('myFolder/*') + '`');
    console.log('or any combination of the above, like `' + green('myFile.ts myFolder/*') + '`');
}

/**
 * Console log that server is running
 * @param filePath
 */
export function showServerRunning(filePath: string): void {
    // Helpful message
    console.log(green('╭───────────────────────────╮'));
    console.log(green('│      ') + 'Graph visible @ ' + green('     │'));
    console.log(green('│   ') + filePath + green('   │'));
    console.log(green('│      ') + 'Ctrl + C to quit ' + green('    │'));
    console.log(green('╰───────────────────────────╯'));
}
