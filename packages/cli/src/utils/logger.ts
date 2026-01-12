import chalk from 'chalk';
import ora, { Ora } from 'ora';

export interface LoggerOptions {
  verbose: boolean;
}

export class Logger {
  private verbose: boolean;
  private spinner: Ora | null = null;

  constructor(options: LoggerOptions = { verbose: false }) {
    this.verbose = options.verbose;
  }

  startLoading(message: string): void {
    if (!this.verbose) {
      this.spinner = ora(message).start();
    } else {
      console.log(chalk.cyan('⏳'), message);
    }
  }

  stopLoading(message?: string, success: boolean = true): void {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(message);
      } else {
        this.spinner.fail(message);
      }
      this.spinner = null;
    } else if (message && this.verbose) {
      if (success) {
        this.success(message);
      } else {
        this.error(message);
      }
    }
  }

  updateLoading(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
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
    console.log(chalk.hex('#3178C6')('      _ _   _        '));
    console.log(chalk.hex('#2B6CB0')(' _ __(_) |_| |_ __ _ '));
    console.log(chalk.hex('#2563EB')('| ´__| | / /  _/ _` |'));
    console.log(chalk.hex('#1E40AF')('|_|  |_|_\\_\\__\\__,_|'));
  }

  tagline(text: string): void {
    console.log(chalk.dim(text));
  }
}

export function createLogger(verbose: boolean = false): Logger {
  return new Logger({ verbose });
}
