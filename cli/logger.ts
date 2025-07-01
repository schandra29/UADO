import { printSuccess, printError, printInfo } from './ui';

export function logInfo(message: string): void {
  printInfo(message);
}

export function logError(message: string): void {
  printError(message);
}

export function logSuccess(message: string): void {
  printSuccess(message);
}

export function logSuccessFinal(message: string): void {
  printSuccess(message);
}

export function logDryRunNotice(): void {
  printSuccess('Dry run complete — no changes made.');
}
