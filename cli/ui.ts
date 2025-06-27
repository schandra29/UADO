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

export function printSuccess(msg: string): void {
  console.log(chalk.green(`✅ ${msg}`));
}

export function printError(msg: string): void {
  console.error(chalk.red(`❌ ${msg}`));
}

export function printTip(msg: string): void {
  console.log(chalk.cyan(`💡 ${msg}`));
}

export function printInfo(msg: string): void {
  console.log(chalk.gray(msg));
}
