import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { table } from 'table';
import { EnhancedMemoryManager } from '@squad/core';
import { config } from '../config';

export function memoryCommands(program: Command) {
  const memory = program.command('memory');

  // Query memories
  memory
    .command('query')
    .description('Query agent memories')
    .option('-a, --agent <id>', 'Agent ID')
    .option('-t, --type <type>', 'Memory type (conversation|working|episode)')
    .option('-n, --limit <number>', 'Number of results', '10')
    .option('--since <date>', 'Start date')
    .option('--until <date>', 'End date')
    .action(async (options) => {
      const spinner = ora('Querying memories...').start();
      try {
        const memoryManager = new EnhancedMemoryManager({
          storage: {
            type: 'supabase',
            config: {
              url: config.get('supabaseUrl'),
              key: config.get('supabaseKey')
            }
          },
          vectorStore: {
            dimensions: 1536,
            similarity: 'cosine'
          }
        });

        const memories = await memoryManager.queryMemories({
          type: options.type,
          agentId: options.agent,
          startTime: options.since ? new Date(options.since) : undefined,
          endTime: options.until ? new Date(options.until) : undefined,
          limit: parseInt(options.limit)
        });

        spinner.stop();

        const data = memories.map(m => [
          m.entry.id,
          m.entry.type,
          m.entry.content.substring(0, 100) + '...',
          new Date(m.entry.timestamp).toLocaleString(),
          m.score.toFixed(2)
        ]);

        console.log(table([
          ['ID', 'Type', 'Content', 'Timestamp', 'Relevance'],
          ...data
        ]));
      } catch (error) {
        spinner.fail('Failed to query memories');
        console.error(chalk.red(error));
      }
    });

  // View memory details
  memory
    .command('view')
    .description('View memory details')
    .argument('<id>', 'Memory ID')
    .action(async (id) => {
      const spinner = ora('Fetching memory...').start();
      try {
        const memoryManager = new EnhancedMemoryManager({
          storage: {
            type: 'supabase',
            config: {
              url: config.get('supabaseUrl'),
              key: config.get('supabaseKey')
            }
          },
          vectorStore: {
            dimensions: 1536,
            similarity: 'cosine'
          }
        });

        const memories = await memoryManager.queryMemories({
          content: id,
          limit: 1
        });

        if (memories.length === 0) {
          throw new Error('Memory not found');
        }

        const memory = memories[0].entry;
        spinner.stop();

        console.log(chalk.bold('\nMemory Details:'));
        console.log(JSON.stringify(memory, null, 2));
      } catch (error) {
        spinner.fail('Failed to fetch memory');
        console.error(chalk.red(error));
      }
    });

  // Delete memories
  memory
    .command('delete')
    .description('Delete memories')
    .option('-a, --agent <id>', 'Agent ID')
    .option('-t, --type <type>', 'Memory type')
    .option('--older-than <date>', 'Delete memories older than date')
    .option('-f, --force', 'Skip confirmation')
    .action(async (options) => {
      try {
        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Are you sure you want to delete these memories?',
              default: false
            }
          ]);
          if (!confirm) return;
        }

        const spinner = ora('Deleting memories...').start();
        
        const memoryManager = new EnhancedMemoryManager({
          storage: {
            type: 'supabase',
            config: {
              url: config.get('supabaseUrl'),
              key: config.get('supabaseKey')
            }
          },
          vectorStore: {
            dimensions: 1536,
            similarity: 'cosine'
          }
        });

        await memoryManager.cleanup();
        
        spinner.succeed('Memories deleted successfully');
      } catch (error) {
        console.error(chalk.red('Failed to delete memories:'), error);
      }
    });

  // Export memories
  memory
    .command('export')
    .description('Export memories')
    .option('-a, --agent <id>', 'Agent ID')
    .option('-t, --type <type>', 'Memory type')
    .option('-f, --format <format>', 'Export format (json|csv)', 'json')
    .option('-o, --output <file>', 'Output file')
    .action(async (options) => {
      const spinner = ora('Exporting memories...').start();
      try {
        const memoryManager = new EnhancedMemoryManager({
          storage: {
            type: 'supabase',
            config: {
              url: config.get('supabaseUrl'),
              key: config.get('supabaseKey')
            }
          },
          vectorStore: {
            dimensions: 1536,
            similarity: 'cosine'
          }
        });

        const memories = await memoryManager.queryMemories({
          type: options.type,
          agentId: options.agent
        });

        const outputFile = options.output || `memories_${Date.now()}.${options.format}`;
        
        if (options.format === 'json') {
          await Deno.writeTextFile(outputFile, JSON.stringify(memories, null, 2));
        } else {
          // Convert to CSV
          const csv = memories.map(m => [
            m.entry.id,
            m.entry.type,
            m.entry.content,
            m.entry.timestamp,
            JSON.stringify(m.entry.metadata)
          ].join(',')).join('\n');
          
          await Deno.writeTextFile(outputFile, csv);
        }

        spinner.succeed(`Memories exported to ${outputFile}`);
      } catch (error) {
        spinner.fail('Failed to export memories');
        console.error(chalk.red(error));
      }
    });

  // Import memories
  memory
    .command('import')
    .description('Import memories')
    .argument('<file>', 'Input file')
    .option('-a, --agent <id>', 'Agent ID')
    .option('--merge', 'Merge with existing memories')
    .action(async (file, options) => {
      const spinner = ora('Importing memories...').start();
      try {
        const memoryManager = new EnhancedMemoryManager({
          storage: {
            type: 'supabase',
            config: {
              url: config.get('supabaseUrl'),
              key: config.get('supabaseKey')
            }
          },
          vectorStore: {
            dimensions: 1536,
            similarity: 'cosine'
          }
        });

        const content = await Deno.readTextFile(file);
        const memories = JSON.parse(content);

        for (const memory of memories) {
          await memoryManager.saveMemory({
            content: memory.content,
            type: memory.type,
            agentId: options.agent || memory.agentId,
            metadata: memory.metadata
          });
        }

        spinner.succeed('Memories imported successfully');
      } catch (error) {
        spinner.fail('Failed to import memories');
        console.error(chalk.red(error));
      }
    });

  // Consolidate memories
  memory
    .command('consolidate')
    .description('Consolidate agent memories')
    .option('-a, --agent <id>', 'Agent ID')
    .option('--dry-run', 'Show what would be consolidated')
    .action(async (options) => {
      const spinner = ora('Consolidating memories...').start();
      try {
        const memoryManager = new EnhancedMemoryManager({
          storage: {
            type: 'supabase',
            config: {
              url: config.get('supabaseUrl'),
              key: config.get('supabaseKey')
            }
          },
          vectorStore: {
            dimensions: 1536,
            similarity: 'cosine'
          }
        });

        if (options.dryRun) {
          spinner.info('Dry run - no changes will be made');
          const stats = await memoryManager.getStats();
          console.log('Would consolidate:');
          console.log(`- ${stats.byType.conversation || 0} conversation memories`);
          console.log(`- ${stats.byType.working || 0} working memories`);
          return;
        }

        await memoryManager.consolidateMemories();
        spinner.succeed('Memories consolidated successfully');
      } catch (error) {
        spinner.fail('Failed to consolidate memories');
        console.error(chalk.red(error));
      }
    });

  // Get memory statistics
  memory
    .command('stats')
    .description('Get memory statistics')
    .option('-a, --agent <id>', 'Agent ID')
    .action(async (options) => {
      const spinner = ora('Fetching memory statistics...').start();
      try {
        const memoryManager = new EnhancedMemoryManager({
          storage: {
            type: 'supabase',
            config: {
              url: config.get('supabaseUrl'),
              key: config.get('supabaseKey')
            }
          },
          vectorStore: {
            dimensions: 1536,
            similarity: 'cosine'
          }
        });

        const stats = await memoryManager.getStats();
        spinner.stop();

        console.log(chalk.bold('\nMemory Statistics:'));
        console.log(JSON.stringify(stats, null, 2));
      } catch (error) {
        spinner.fail('Failed to fetch memory statistics');
        console.error(chalk.red(error));
      }
    });

  return memory;
}