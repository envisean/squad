# Squad CLI

Command-line interface for managing Squad AI agents, memory, and monitoring.

## Installation

```bash
# From the repository root
pnpm install
pnpm build

# Link the CLI globally
cd packages/cli
pnpm link --global
```

## Configuration

Before using the CLI, you need to configure your environment:

```bash
# Interactive configuration
squad config set

# Or set individual values
squad config set supabaseUrl "your-url"
squad config set supabaseKey "your-key"
squad config set openaiKey "your-key"
```

## Command Reference

### Agent Management

```bash
# List all agents
squad agent list [options]
  -t, --type <type>     Filter by agent type (strategic|job)
  -s, --status <status> Filter by status (active|idle|error)

# Create a new agent
squad agent create
  # Interactive prompt will guide you through configuration

# Start an agent
squad agent start <id> [options]
  -d, --debug           Enable debug mode

# Stop an agent
squad agent stop <id> [options]
  -f, --force          Force stop without graceful shutdown

# View agent logs
squad agent logs <id> [options]
  -n, --lines <number> Number of lines to show (default: 100)
  -f, --follow        Follow log output in real-time

# Update agent configuration
squad agent update <id>
  # Interactive prompt will show current values

# Delete an agent
squad agent delete <id> [options]
  -f, --force         Skip confirmation prompt
```

### Memory Operations

```bash
# Query memories
squad memory query [options]
  -a, --agent <id>    Filter by agent ID
  -t, --type <type>   Memory type (conversation|working|episode)
  -n, --limit <num>   Number of results (default: 10)
  --since <date>      Start date
  --until <date>      End date

# View memory details
squad memory view <id>

# Delete memories
squad memory delete [options]
  -a, --agent <id>    Filter by agent ID
  -t, --type <type>   Memory type
  --older-than <date> Delete memories older than date
  -f, --force         Skip confirmation

# Export memories
squad memory export [options]
  -a, --agent <id>    Filter by agent ID
  -t, --type <type>   Memory type
  -f, --format <fmt>  Export format (json|csv)
  -o, --output <file> Output file

# Import memories
squad memory import <file> [options]
  -a, --agent <id>    Target agent ID
  --merge             Merge with existing memories

# Consolidate memories
squad memory consolidate [options]
  -a, --agent <id>    Target agent ID
  --dry-run           Show what would be consolidated

# View memory statistics
squad memory stats [options]
  -a, --agent <id>    Filter by agent ID
```

### Monitoring

```bash
# Watch real-time activity
squad monitor watch [options]
  -a, --agent <id>     Filter by agent ID
  -l, --level <level>  Log level (debug|info|warn|error)

# Get agent metrics
squad monitor metrics [options]
  -a, --agent <id>     Filter by agent ID
  --since <time>       Start time
  --until <time>       End time

# View agent status
squad monitor status [options]
  -a, --agent <id>     Filter by agent ID

# Generate performance report
squad monitor report [options]
  -a, --agent <id>     Filter by agent ID
  --from <date>        Start date
  --to <date>          End date
  -o, --output <file>  Output file

# Configure monitoring alerts
squad monitor alerts
  # Interactive prompt for alert configuration

# Check system health
squad monitor health
```

### Configuration Management

```bash
# Set configuration
squad config set [key] [value]
  # Without arguments, enters interactive mode

# Get configuration
squad config get [key]
  # Without key, shows all config

# Delete configuration
squad config delete <key>

# Reset configuration
squad config reset [options]
  -f, --force          Skip confirmation

# Import configuration
squad config import <file>

# Export configuration
squad config export [options]
  -o, --output <file>  Output file
```

## Examples

### Managing Agents

```bash
# Create and start a new agent
squad agent create
squad agent start <id>

# Monitor agent activity
squad agent logs <id> -f

# Update agent configuration
squad agent update <id>
```

### Working with Memory

```bash
# Query recent conversations
squad memory query -t conversation --since "2024-01-01"

# Export agent memories
squad memory export -a <agent-id> -f json -o memories.json

# Consolidate old memories
squad memory consolidate -a <agent-id> --dry-run
```

### Monitoring

```bash
# Watch real-time activity
squad monitor watch -l debug

# Generate weekly report
squad monitor report --from "2024-01-01" --to "2024-01-07" -o weekly.pdf

# Check system health
squad monitor health
```

## Development

### Adding New Commands

1. Create a new command file in `src/commands/`
2. Define command structure using Commander.js
3. Export command function
4. Register in `src/index.ts`

Example:
```typescript
import { Command } from 'commander';

export function newCommand(program: Command) {
  const cmd = program.command('new-cmd');
  
  cmd
    .command('subcommand')
    .description('Description')
    .action(async () => {
      // Implementation
    });

  return cmd;
}
```

### Testing Commands

```bash
# Build CLI
pnpm build

# Run command
./dist/index.js command [options]
```

## Current Limitations

1. **Stubbed Functionality**: Many commands are currently stubbed and need implementation:
   - Agent management needs integration with core agent system
   - Memory operations need integration with memory manager
   - Monitoring needs integration with monitoring system

2. **Planned Features**:
   - Real-time agent interaction
   - Batch operations
   - Custom command plugins
   - Advanced filtering and search
   - Performance optimizations

## Contributing

1. Create feature branch
2. Implement changes
3. Add tests
4. Submit pull request

## Troubleshooting

### Common Issues

1. **Configuration Issues**
   ```bash
   # Verify configuration
   squad config get
   
   # Reset if needed
   squad config reset
   ```

2. **Connection Issues**
   ```bash
   # Check system health
   squad monitor health
   ```

3. **Permission Issues**
   ```bash
   # Check CLI installation
   which squad
   
   # Reinstall if needed
   pnpm unlink -g @squad/cli
   pnpm link --global
   ```