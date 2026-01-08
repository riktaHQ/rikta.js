import { Injectable } from '@riktajs/core';

@Injectable()
export class GreetingService {
  private readonly appName = 'Rikta';

  getWelcomeMessage(): string {
    return `Welcome to ${this.appName}!`;
  }

  getGreeting(name: string): string {
    return `Hello, ${name}! Welcome to ${this.appName}.`;
  }
}
