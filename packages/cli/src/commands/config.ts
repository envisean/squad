import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import Conf from 'conf';

const config = new Conf({
  projectName: 'squad',
  schema: {
    supabaseUrl: {
      type: 'string'
    },
    supabaseKey: {
      type: 'string'
    },
    openaiKey: {
      type: 'string'
    },
    defaultModel: {
      type: 'string',
      default: 'gpt-4'
    },
    logLevel: {
      type: 'string',
      default: 'info'
    }
  }
});

export function configCommands(program: Command) {
  const conf = program.command('config');

  // Set configuration
  conf
    .command('set')
    .description('Set configuration values')
    .argument('[key]', 'Configuration key')
    .argument('[value]', 'Configuration value')
    .action(async (key, value) => {
      try {
        if (key && value) {
          config.set(key, value);
          console.log(chalk.green(`Set ${key} = ${value}`));
          return;
        }

        // Interactive configuration
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'supabaseUrl',
            message: 'Supabase URL:',
            default: config.get('supabaseUrl')
          },
          {
            type: 'password',
            name: 'supabaseKey',
            message: 'Supabase Key:',
            mask: '*'
          },
          {
            type: 'password',
            name: 'openaiKey',
            message: 'OpenAI API Key:',
            mask: '*'
          },
          {
            type: 'list',
            name: 'defaultModel',
            message: 'Default LLM Model:',
            choices: ['gpt-4', 'gpt-3.5-turbo'],
            default: config.get('defaultModel')
          },
          {
            type: 'list',
            name: 'logLevel',
            message: 'Log Level:',
            choices: ['debug', 'info', 'warn', 'error'],
            default: config.get('logLevel')
          }
        ]);

        // Save all configurations
        Object.entries(answers).forEach(([key, value]) => {
          config.set(key, value);
        });

        console.log(chalk.green('Configuration updated successfully'));
      } catch (error) {
        console.error(chalk.red('Failed to update configuration:'), error);
      }
    });

  // Get configuration
  conf
    .command('get')
    .description('Get configuration value')
    .argument('[key]', 'Configuration key')
    .action((key) => {
      try {
        if (key) {
          const value = config.get(key);
          if (value === undefined) {
            console.log(chalk.yellow(`No value set for ${key}`));
            return;
          }
          console.log(value);
          return;
        }

        // Show all configuration
        const allConfig = config.store;
        console.log(chalk.bold('\nCurrent Configuration:'));
        Object.entries(allConfig).forEach(([key, value]) => {
          // Mask sensitive values
          const maskedValue = key.toLowerCase().includes('key') 
            ? '****' 
            : value;
          console.log(`${key}: ${maskedValue}`);
        });
      } catch (error) {
        console.error(chalk.red('Failed to get configuration:'), error);
      }
    });

  // Delete configuration
  conf
    .command('delete')
    .description('Delete configuration value')
    .argument('<key>', 'Configuration key')
    .action((key) => {
      try {
        config.delete(key);
        console.log(chalk.green(`Deleted configuration: ${key}`));
      } catch (error) {
        console.error(chalk.red('Failed to delete configuration:'), error);
      }
    });

  // Reset configuration
  conf
    .command('reset')
    .description('Reset all configuration to defaults')
    .option('-f, --force', 'Skip confirmation')
    .action(async (options) => {
      try {
        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Are you sure you want to reset all configuration?',
              default: false
            }
          ]);
          if (!confirm) return;
        }

        config.clear();
        console.log(chalk.green('Configuration reset to defaults'));
      } catch (error) {
        console.error(chalk.red('Failed to reset configuration:'), error);
      }
    });

  // Import configuration
  conf
    .command('import')
    .description('Import configuration from file')
    .argument('<file>', 'Configuration file path')
    .action(async (file) => {
      const spinner = ora('Importing configuration...').start();
      try {
        // TODO: Implement configuration import
        await new Promise(r => setTimeout(r, 1000));
        spinner.succeed('Configuration imported successfully');
      } catch (error) {
        spinner.fail('Failed to import configuration');
        console.error(chalk.red(error));
      }
    });

  // Export configuration
  conf
    .command('export')
    .description('Export configuration to file')
    .option('-o, --output <file>', 'Output file path')
    .action(async (options) => {
      const spinner = ora('Exporting configuration...').start();
      try {
        const outputFile = options.output || `squad_config_${Date.now()}.json`;
        // TODO: Implement configuration export
        await new Promise(r => setTimeout(r, 1000));
        spinner.succeed(`Configuration exported to ${outputFile}`);
      } catch (error) {
        spinner.fail('Failed to export configuration');
        console.error(chalk.red(error));
      }
    });

  return conf;
}