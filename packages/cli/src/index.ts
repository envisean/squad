#!/usr/bin/env node
import { Command } from 'commander';
import { config } from 'dotenv';
import { agentCommands } from './commands/agent';
import { memoryCommands } from './commands/memory';
import { monitorCommands } from './commands/monitor';
import { configCommands } from './commands/config';

// Load environment variables
config();

const program = new Command();

program
  .name('squad')
  .description('CLI for managing Squad AI agents')
  .version('0.1.0');

// Add command groups
agentCommands(program);
memoryCommands(program);
monitorCommands(program);
configCommands(program);

program.parse();