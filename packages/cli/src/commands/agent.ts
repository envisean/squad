import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { z } from 'zod';
import { ControlPlane } from '@squad/core';
import { config } from '../config';

const AgentConfigSchema = z.object({
  name: z.string(),
  type: z.enum(['strategic', 'job']),
  description: z.string(),
  capabilities: z.array(z.string()),
  model: z.string(),
  tools: z.array(z.string())
});

export function agentCommands(program: Command) {
  const agent = program.command('agent');

  // List agents
  agent
    .command('list')
    .description('List all agents')
    .option('-t, --type <type>', 'Filter by agent type')
    .option('-s, --status <status>', 'Filter by status')
    .action(async (options) => {
      const spinner = ora('Fetching agents...').start();
      try {
        const controlPlane = new ControlPlane({
          supabaseUrl: config.get('supabaseUrl'),
          supabaseKey: config.get('supabaseKey')
        });

        const agents = await controlPlane.getActiveAgents();
        spinner.stop();

        const data = agents.map(a => [
          a.id,
          a.type,
          a.status,
          a.edgeFunction,
          new Date(a.metadata.lastHeartbeat).toLocaleString()
        ]);

        console.log(table([
          ['ID', 'Type', 'Status', 'Location', 'Last Heartbeat'],
          ...data
        ]));
      } catch (error) {
        spinner.fail('Failed to fetch agents');
        console.error(chalk.red(error));
      }
    });

  // Create agent
  agent
    .command('create')
    .description('Create a new agent')
    .action(async () => {
      try {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Agent name:'
          },
          {
            type: 'list',
            name: 'type',
            message: 'Agent type:',
            choices: ['strategic', 'job']
          },
          {
            type: 'input',
            name: 'description',
            message: 'Description:'
          },
          {
            type: 'checkbox',
            name: 'capabilities',
            message: 'Select capabilities:',
            choices: [
              'reasoning',
              'planning',
              'conversation',
              'code-generation',
              'data-analysis'
            ]
          },
          {
            type: 'list',
            name: 'model',
            message: 'Select LLM model:',
            choices: ['gpt-4', 'gpt-3.5-turbo']
          },
          {
            type: 'checkbox',
            name: 'tools',
            message: 'Select tools:',
            choices: [
              'github',
              'jira',
              'slack',
              'gmail',
              'calendar'
            ]
          }
        ]);

        const config = AgentConfigSchema.parse(answers);
        const spinner = ora('Creating agent...').start();

        const controlPlane = new ControlPlane({
          supabaseUrl: config.get('supabaseUrl'),
          supabaseKey: config.get('supabaseKey')
        });

        const agentId = await controlPlane.registerAgent({
          type: answers.type,
          edgeFunction: 'agent-runner',
          config: answers,
          metadata: {
            version: '1.0.0',
            resources: {
              cpu: 1,
              memory: 512
            }
          }
        });

        spinner.succeed('Agent created successfully');
        console.log(chalk.green('\nAgent ID:'), agentId);
      } catch (error) {
        console.error(chalk.red('Failed to create agent:'), error);
      }
    });

  // Start agent
  agent
    .command('start')
    .description('Start an agent')
    .argument('<id>', 'Agent ID')
    .option('-d, --debug', 'Enable debug mode')
    .action(async (id, options) => {
      const spinner = ora(`Starting agent ${id}...`).start();
      try {
        const controlPlane = new ControlPlane({
          supabaseUrl: config.get('supabaseUrl'),
          supabaseKey: config.get('supabaseKey')
        });

        await controlPlane.sendCommand(id, 'start', {
          debug: options.debug
        });

        spinner.succeed(`Agent ${id} started successfully`);
      } catch (error) {
        spinner.fail(`Failed to start agent ${id}`);
        console.error(chalk.red(error));
      }
    });

  // Stop agent
  agent
    .command('stop')
    .description('Stop an agent')
    .argument('<id>', 'Agent ID')
    .option('-f, --force', 'Force stop')
    .action(async (id, options) => {
      const spinner = ora(`Stopping agent ${id}...`).start();
      try {
        const controlPlane = new ControlPlane({
          supabaseUrl: config.get('supabaseUrl'),
          supabaseKey: config.get('supabaseKey')
        });

        await controlPlane.sendCommand(id, 'stop', {
          force: options.force
        });

        spinner.succeed(`Agent ${id} stopped successfully`);
      } catch (error) {
        spinner.fail(`Failed to stop agent ${id}`);
        console.error(chalk.red(error));
      }
    });

  // Get agent logs
  agent
    .command('logs')
    .description('Get agent logs')
    .argument('<id>', 'Agent ID')
    .option('-n, --lines <number>', 'Number of lines', '100')
    .option('-f, --follow', 'Follow log output')
    .action(async (id, options) => {
      try {
        const controlPlane = new ControlPlane({
          supabaseUrl: config.get('supabaseUrl'),
          supabaseKey: config.get('supabaseKey')
        });

        // Get agent metrics
        const metrics = await controlPlane.getAgentMetrics(id);
        
        console.log(chalk.bold('\nAgent Metrics:'));
        metrics.slice(0, parseInt(options.lines)).forEach(m => {
          console.log(chalk.gray(
            `[${new Date(m.timestamp).toLocaleString()}] CPU: ${m.metrics.cpu}%, Memory: ${m.metrics.memory}MB`
          ));
        });
        
        if (options.follow) {
          console.log(chalk.yellow('\nWatching for new metrics... (Ctrl+C to exit)'));
          // Subscribe to real-time updates
          // TODO: Implement real-time subscription
        }
      } catch (error) {
        console.error(chalk.red('Failed to fetch logs:'), error);
      }
    });

  // Update agent
  agent
    .command('update')
    .description('Update agent configuration')
    .argument('<id>', 'Agent ID')
    .action(async (id) => {
      try {
        const controlPlane = new ControlPlane({
          supabaseUrl: config.get('supabaseUrl'),
          supabaseKey: config.get('supabaseKey')
        });

        // Get current agent
        const agents = await controlPlane.getActiveAgents();
        const currentAgent = agents.find(a => a.id === id);
        
        if (!currentAgent) {
          throw new Error('Agent not found');
        }

        const answers = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'capabilities',
            message: 'Select capabilities:',
            choices: [
              'reasoning',
              'planning',
              'conversation',
              'code-generation',
              'data-analysis'
            ],
            default: currentAgent.config.capabilities
          }
        ]);

        const spinner = ora('Updating agent...').start();
        
        await controlPlane.sendCommand(id, 'update', answers);
        
        spinner.succeed('Agent updated successfully');
      } catch (error) {
        console.error(chalk.red('Failed to update agent:'), error);
      }
    });

  // Delete agent
  agent
    .command('delete')
    .description('Delete an agent')
    .argument('<id>', 'Agent ID')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id, options) => {
      try {
        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Are you sure you want to delete agent ${id}?`,
              default: false
            }
          ]);
          if (!confirm) return;
        }

        const spinner = ora('Deleting agent...').start();
        
        const controlPlane = new ControlPlane({
          supabaseUrl: config.get('supabaseUrl'),
          supabaseKey: config.get('supabaseKey')
        });

        await controlPlane.unregisterAgent(id);
        
        spinner.succeed('Agent deleted successfully');
      } catch (error) {
        console.error(chalk.red('Failed to delete agent:'), error);
      }
    });

  return agent;
}