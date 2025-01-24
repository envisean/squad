import { DocumentSummarizationAgent } from '../'
import { DocumentSummarizationInputSchema } from '../types'
import { config } from 'dotenv'
import { resolve } from 'path'
import chalk from 'chalk'
import ora from 'ora'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const TEST_DOCUMENT = `# Squad AI Platform Development Guide

## Overview
The Squad AI Platform is a comprehensive system for building, deploying, and managing AI agents. 
It provides a robust infrastructure for agent orchestration, memory management, and task execution.

## Core Concepts
1. Agent Types
   - Strategic agents for complex decision making
   - Domain agents for specialized tasks
   - Task agents for simple operations

2. Memory System
   - Short-term memory for immediate context
   - Working memory for active tasks
   - Long-term memory for persistent knowledge

3. Tool Integration
   - Native LangChain tools
   - External API integrations
   - Custom tool development

## Development Practices
1. Follow monorepo structure
2. Use TypeScript for type safety
3. Implement comprehensive testing
4. Maintain clear documentation`

async function runLocalTest() {
  console.log(chalk.cyan('\nInitializing Document Summarization Agent Test'))

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not found in .env.local')
  }

  // Initialize agent with config
  const agent = new DocumentSummarizationAgent({
    openAIApiKey: process.env.OPENAI_API_KEY,
  })

  const spinner = ora()

  // Initialize agent (sets up control plane integration)
  spinner.start('Initializing agent')
  await agent.initialize()
  spinner.succeed('Agent initialized')

  try {
    console.log(chalk.cyan('\nTesting Brief Summary:'))
    spinner.start('Generating brief summary')
    const briefResult = await agent.processTask({
      document: {
        content: TEST_DOCUMENT,
        metadata: {
          type: 'markdown',
          title: 'Development Guide',
        },
      },
      options: {
        summaryType: 'brief',
        format: 'text',
        preserveStructure: false,
      },
    })
    spinner.succeed('Brief summary generated')

    console.log('\nBrief Summary Result:')
    console.log(briefResult.summary.brief)
    console.log('\nKey Points:')
    console.log(briefResult.summary.keyPoints.map(point => `- ${point}`).join('\n'))
    console.log('\nMetrics:')
    console.log(`- Processing Time: ${briefResult.summary.metadata.processingTime}ms`)
    console.log(`- Compression Ratio: ${briefResult.summary.metadata.compressionRatio.toFixed(2)}x`)

    console.log(chalk.cyan('\nTesting Detailed Summary:'))
    spinner.start('Generating detailed summary')
    const detailedResult = await agent.processTask({
      document: {
        content: TEST_DOCUMENT,
        metadata: {
          type: 'markdown',
          title: 'Development Guide',
        },
      },
      options: {
        summaryType: 'detailed',
        format: 'markdown',
        preserveStructure: true,
      },
    })
    spinner.succeed('Detailed summary generated')

    console.log('\nDetailed Summary Result:')
    console.log('Overview:')
    console.log(detailedResult.summary.detailed?.overview)
    console.log('\nSections:')
    detailedResult.summary.detailed?.sections.forEach(section => {
      console.log(`\n## ${section.title}`)
      console.log(section.content)
      if (section.subsections) {
        section.subsections.forEach(sub => {
          console.log(`\n### ${sub.title}`)
          console.log(sub.content)
        })
      }
    })
    console.log('\nMetrics:')
    console.log(`- Processing Time: ${detailedResult.summary.metadata.processingTime}ms`)
    console.log(
      `- Compression Ratio: ${detailedResult.summary.metadata.compressionRatio.toFixed(2)}x`
    )
  } catch (error) {
    spinner.fail('Error during test')
    console.error(chalk.red('Error details:'), error)
    throw error
  } finally {
    // Cleanup agent (removes control plane integration)
    spinner.start('Cleaning up agent')
    await agent.cleanup()
    spinner.succeed('Agent cleaned up')
  }
}

// Run the test if this file is being executed directly
if (require.main === module) {
  runLocalTest().catch(console.error)
}

// Export for test runner
export default runLocalTest
