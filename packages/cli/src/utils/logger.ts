import chalk from 'chalk';

export interface LoggerOptions {
  verbose: boolean;
}

export class Logger {
  private verbose: boolean;

  constructor(options: LoggerOptions = { verbose: false }) {
    this.verbose = options.verbose;
  }

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✔'), message);
  }

  warn(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  error(message: string): void {
    console.error(chalk.red('✖'), message);
  }

  debug(message: string): void {
    if (this.verbose) {
      console.log(chalk.gray('🔍'), chalk.gray(message));
    }
  }

  step(step: number, total: number, message: string): void {
    console.log(chalk.cyan(`[${step}/${total}]`), message);
  }

  newLine(): void {
    console.log();
  }

  banner(text: string): void {
    const line = '─'.repeat(text.length + 4);
    console.log(chalk.magenta(line));
    console.log(chalk.magenta('│'), chalk.bold(text), chalk.magenta('│'));
    console.log(chalk.magenta(line));
  }
}

export function createLogger(verbose: boolean = false): Logger {
  return new Logger({ verbose });
}
