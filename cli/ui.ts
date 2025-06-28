let chalk: {
  green: (s: string) => string;
  red: (s: string) => string;
  cyan: (s: string) => string;
  gray: (s: string) => string;
};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  chalk = require('chalk');
} catch {
  chalk = {
    green: (s: string) => s,
    red: (s: string) => s,
    cyan: (s: string) => s,
    gray: (s: string) => s
  };
}

let emojiEnabled = process.platform !== 'win32' && process.env.NO_EMOJI !== '1';

export function setUseEmoji(flag: boolean): void {
  emojiEnabled = flag;
}

function icon(emoji: string, ascii: string): string {
  return emojiEnabled ? emoji : ascii;
}

function replaceIcons(line: string): string {
  if (emojiEnabled) return line;
  return line
    .replace(/✅/g, '[ok]')
    .replace(/❌/g, '[err]')
    .replace(/💡/g, '[tip]')
    .replace(/📂/g, '[dir]')
    .replace(/🧠/g, '[info]')
    .replace(/📜/g, '[log]')
    .replace(/📝/g, '[write]')
    .replace(/🕒/g, '[wait]')
    .replace(/🔁/g, '[replay]')
    .replace(/🧾/g, '[#]')
    .replace(/🎉/g, '*')
    .replace(/🔴/g, '[!]')
    .replace(/🟢/g, '[+]');
}

export function printSuccess(msg: string): void {
  console.log(chalk.green(replaceIcons(`${icon('✅', 'ok')} ${msg}`)));
}

export function printError(msg: string): void {
  console.error(chalk.red(replaceIcons(`${icon('❌', 'err')} ${msg}`)));
}

export function printTip(msg: string): void {
  console.log(chalk.cyan(replaceIcons(`${icon('💡', 'tip')} ${msg}`)));
}

export function printWarn(msg: string): void {
  console.log(chalk.cyan(replaceIcons(`${icon('🔴', '[!]')} ${msg}`)));
}

export function printInfo(msg: string): void {
  console.log(chalk.gray(replaceIcons(msg)));
}
