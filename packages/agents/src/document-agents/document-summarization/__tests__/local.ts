import { DocumentSummarizationAgent } from '..'

const TEST_DOCUMENT = `# Squad AI Platform Development Guide

## Overview

The Squad AI Platform is a comprehensive system for building, deploying, and managing AI agents. This guide covers the core concepts, architecture, and development practices.

## Core Concepts

### Agent Types

We support several types of agents:
1. Strategic Agents - Handle complex decision making and planning
2. Job Agents - Execute specific tasks with defined inputs/outputs
3. Document Agents - Process and analyze various document types

### Memory Systems

Our memory architecture includes:
- Short-term memory for recent context
- Working memory for active tasks
- Long-term memory using vector storage
- Episodic memory for important events

## Development Practices

### Code Organization

Follow these principles:
1. Clear separation of concerns
2. Type safety with TypeScript
3. Comprehensive testing
4. Documentation first approach

### Deployment

We use edge functions for agent deployment:
- Optimized for cold starts
- Efficient resource usage
- Global distribution
- Automatic scaling`

export default async function runLocalTest() {
  const agent = new DocumentSummarizationAgent(process.env.OPENAI_API_KEY!)

  // Test brief summary
  console.log('\nTesting Brief Summary:')
  const briefResult = await agent.process({
    document: {
      content: TEST_DOCUMENT,
      metadata: {
        type: 'markdown',
        title: 'Squad AI Platform Development Guide',
      },
    },
    options: {
      summaryType: 'brief',
      preserveStructure: false,
      format: 'text',
    },
  })
  console.log(JSON.stringify(briefResult, null, 2))

  // Test detailed summary
  console.log('\nTesting Detailed Summary:')
  const detailedResult = await agent.process({
    document: {
      content: TEST_DOCUMENT,
      metadata: {
        type: 'markdown',
        title: 'Squad AI Platform Development Guide',
      },
    },
    options: {
      summaryType: 'detailed',
      preserveStructure: true,
      format: 'markdown',
    },
  })
  console.log(JSON.stringify(detailedResult, null, 2))
}
