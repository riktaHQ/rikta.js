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
    console.log(message);
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
      console.log(chalk.gray(message));
    }
  }

  step(step: number, total: number, message: string): void {
    console.log(chalk.cyan(`[${step}/${total}]`), message);
  }

  newLine(): void {
    console.log();
  }

  title(): void {
    console.log(chalk.cyan('      _ _   _        '));
    console.log(chalk.cyan(' _ __(_) |_| |_ __ _ '));
    console.log(chalk.cyan('| ´__| | / /  _/ _` |'));
    console.log(chalk.cyan('|_|  |_|_\\_\\__\\__,_|'));
  }

  tagline(text: string): void {
    console.log(chalk.dim(text));
  }
}

export function createLogger(verbose: boolean = false): Logger {
  return new Logger({ verbose });
}
