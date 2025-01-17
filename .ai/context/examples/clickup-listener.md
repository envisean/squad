# ClickUp Task Assignment Listener

This agent monitors ClickUp for task assignments and manages the workflow around task assignments, including notifications, resource allocation, and progress tracking.

## Implementation

```typescript
import { BaseAgent } from '@squad/agents';
import { ComposioToolSet, Action, App } from 'composio-langchain';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { SupabaseVectorStore } from '@squad/integrations';

interface TaskAssignment {
  taskId: string;
  assigneeId: string;
  assigneeName: string;
  taskName: string;
  description: string;
  dueDate?: Date;
  priority: string;
  status: string;
  tags: string[];
}

interface WorkloadMetrics {
  currentTasks: number;
  upcomingDeadlines: number;
  averageCompletion: number;
  tasksByPriority: Record<string, number>;
}

export class ClickUpAssignmentAgent extends BaseAgent {
  private tools: ComposioToolSet;
  private model: ChatOpenAI;
  private vectorStore: SupabaseVectorStore;
  private workloadCache: Map<string, WorkloadMetrics>;

  constructor(config: AgentConfig) {
    super(config);
    
    this.model = new ChatOpenAI({
      modelName: 'gpt-4',
      temperature: 0.3
    });

    this.tools = new ComposioToolSet({
      api_key: process.env.COMPOSIO_API_KEY,
      apps: [
        App.CLICKUP,
        App.SLACK,
        App.GMAIL,
        App.CALENDAR
      ]
    });

    this.vectorStore = new SupabaseVectorStore({
      tableName: 'task_embeddings',
      queryName: 'match_tasks'
    });

    this.workloadCache = new Map();
  }

  async initialize(): Promise<void> {
    await this.tools.initialize();
    await this.setupWebhooks();
    await this.loadWorkloadMetrics();
  }

  private async setupWebhooks(): Promise<void> {
    // Set up ClickUp webhook for task assignments
    await this.tools.execute(
      Action.CLICKUP_CREATE_WEBHOOK,
      {
        endpoint: process.env.WEBHOOK_URL,
        events: ['taskAssigned', 'taskUpdated', 'taskDeleted']
      }
    );
  }

  async handleTaskAssignment(assignment: TaskAssignment): Promise<void> {
    // Get assignee's current workload
    const workload = await this.getAssigneeWorkload(assignment.assigneeId);
    
    // Analyze task and workload
    const analysis = await this.analyzeAssignment(assignment, workload);
    
    // Store task context
    await this.storeTaskContext(assignment);
    
    // Handle assignment based on analysis
    if (analysis.needsReassignment) {
      await this.handleReassignment(assignment, analysis);
    } else {
      await this.processAssignment(assignment, analysis);
    }
  }

  private async analyzeAssignment(
    assignment: TaskAssignment,
    workload: WorkloadMetrics
  ) {
    // Get similar past tasks for context
    const similarTasks = await this.vectorStore.similaritySearch(
      assignment.description,
      5
    );

    // Analyze with LLM
    const analysis = await this.model.predict(
      `Analyze this task assignment considering:
      1. Task priority and complexity
      2. Assignee's current workload
      3. Similar past tasks
      4. Due date feasibility

      Task:
      ${JSON.stringify(assignment)}

      Current Workload:
      ${JSON.stringify(workload)}

      Similar Past Tasks:
      ${JSON.stringify(similarTasks)}

      Determine:
      1. If reassignment is needed
      2. Estimated time to complete
      3. Potential blockers
      4. Required resources
      5. Recommended next steps`
    );

    return JSON.parse(analysis);
  }

  private async processAssignment(
    assignment: TaskAssignment,
    analysis: any
  ): Promise<void> {
    // Create calendar block
    if (analysis.timeEstimate) {
      await this.tools.execute(
        Action.CALENDAR_CREATE_EVENT,
        {
          title: `Work on: ${assignment.taskName}`,
          duration: analysis.timeEstimate,
          description: assignment.description,
          attendees: [assignment.assigneeName]
        }
      );
    }

    // Send Slack notification
    await this.tools.execute(
      Action.SLACK_SEND_MESSAGE,
      {
        channel: process.env.SLACK_NOTIFICATIONS_CHANNEL,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*New Task Assignment*\n*Task:* ${assignment.taskName}\n*Assigned to:* ${assignment.assigneeName}\n*Due:* ${assignment.dueDate}\n*Priority:* ${assignment.priority}`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Estimated Time:* ${analysis.timeEstimate}\n*Next Steps:* ${analysis.nextSteps}`
            }
          }
        ]
      }
    );

    // Update ClickUp task with analysis
    await this.tools.execute(
      Action.CLICKUP_UPDATE_TASK,
      {
        taskId: assignment.taskId,
        customFields: {
          timeEstimate: analysis.timeEstimate,
          potentialBlockers: analysis.blockers,
          requiredResources: analysis.resources
        }
      }
    );

    // Send email summary
    await this.tools.execute(
      Action.GMAIL_SEND_EMAIL,
      {
        to: assignment.assigneeName,
        subject: `Task Assignment: ${assignment.taskName}`,
        body: this.generateEmailSummary(assignment, analysis)
      }
    );
  }

  private async handleReassignment(
    assignment: TaskAssignment,
    analysis: any
  ): Promise<void> {
    // Find suitable assignees
    const alternativeAssignees = await this.findAlternativeAssignees(
      assignment,
      analysis
    );

    // Create reassignment request
    await this.tools.execute(
      Action.CLICKUP_CREATE_TASK,
      {
        listId: process.env.CLICKUP_MANAGEMENT_LIST_ID,
        name: `Reassignment Needed: ${assignment.taskName}`,
        description: `
Original Assignment:
${JSON.stringify(assignment, null, 2)}

Analysis:
${JSON.stringify(analysis, null, 2)}

Suggested Assignees:
${JSON.stringify(alternativeAssignees, null, 2)}
        `,
        priority: 'high',
        assignees: [process.env.MANAGER_ID]
      }
    );

    // Notify stakeholders
    await this.notifyReassignmentNeeded(
      assignment,
      analysis,
      alternativeAssignees
    );
  }

  private async findAlternativeAssignees(
    assignment: TaskAssignment,
    analysis: any
  ): Promise<any[]> {
    // Get team members
    const teamMembers = await this.tools.execute(
      Action.CLICKUP_GET_TEAM_MEMBERS,
      {
        teamId: process.env.CLICKUP_TEAM_ID
      }
    );

    // Get workload for each member
    const workloads = await Promise.all(
      teamMembers.map(async member => ({
        member,
        workload: await this.getAssigneeWorkload(member.id)
      }))
    );

    // Score each member's suitability
    const scoredMembers = await Promise.all(
      workloads.map(async ({ member, workload }) => {
        const score = await this.model.predict(
          `Score this team member's suitability for the task:
          
          Task Requirements:
          ${JSON.stringify(analysis.requirements)}

          Member:
          ${JSON.stringify(member)}

          Current Workload:
          ${JSON.stringify(workload)}

          Return a score between 0 and 1.`
        );

        return {
          member,
          workload,
          score: parseFloat(score)
        };
      })
    );

    // Return top 3 alternatives
    return scoredMembers
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  private async getAssigneeWorkload(
    assigneeId: string
  ): Promise<WorkloadMetrics> {
    // Check cache first
    if (this.workloadCache.has(assigneeId)) {
      return this.workloadCache.get(assigneeId)!;
    }

    // Get active tasks
    const tasks = await this.tools.execute(
      Action.CLICKUP_GET_TASKS,
      {
        assigneeId,
        statuses: ['in progress', 'pending', 'review']
      }
    );

    // Calculate metrics
    const metrics: WorkloadMetrics = {
      currentTasks: tasks.length,
      upcomingDeadlines: tasks.filter(t => 
        new Date(t.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ).length,
      averageCompletion: this.calculateAverageCompletion(tasks),
      tasksByPriority: this.groupTasksByPriority(tasks)
    };

    // Update cache
    this.workloadCache.set(assigneeId, metrics);

    return metrics;
  }

  private async storeTaskContext(
    assignment: TaskAssignment
  ): Promise<void> {
    await this.vectorStore.addDocuments([{
      pageContent: `
        Task: ${assignment.taskName}
        Description: ${assignment.description}
        Assignee: ${assignment.assigneeName}
        Priority: ${assignment.priority}
        Tags: ${assignment.tags.join(', ')}
      `,
      metadata: {
        taskId: assignment.taskId,
        assigneeId: assignment.assigneeId,
        status: assignment.status,
        dueDate: assignment.dueDate?.toISOString()
      }
    }]);
  }

  private generateEmailSummary(
    assignment: TaskAssignment,
    analysis: any
  ): string {
    return `
Hi ${assignment.assigneeName},

You've been assigned a new task in ClickUp:

Task: ${assignment.taskName}
Due Date: ${assignment.dueDate}
Priority: ${assignment.priority}

Analysis:
- Estimated Time: ${analysis.timeEstimate}
- Potential Blockers: ${analysis.blockers.join(', ')}
- Required Resources: ${analysis.resources.join(', ')}

Next Steps:
${analysis.nextSteps}

A calendar block has been created for this task. Please review and adjust as needed.

Best regards,
Your ClickUp Assistant
    `;
  }
}

// Example usage in Supabase Edge Function
serve(async (req) => {
  const agent = new ClickUpAssignmentAgent({
    id: 'clickup-listener',
    name: 'ClickUp Assignment Manager',
    description: 'Manages ClickUp task assignments and workload'
  });

  const { task_assignment } = await req.json();
  await agent.handleTaskAssignment(task_assignment);

  return new Response(
    JSON.stringify({ status: 'processed' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

## Configuration

```typescript
// config/clickup-config.ts
export const clickupConfig = {
  workload_limits: {
    max_active_tasks: 5,
    max_high_priority: 2,
    max_upcoming_deadlines: 3
  },
  notification_preferences: {
    slack: {
      enabled: true,
      mention_on_priority: ['high', 'urgent'],
      channels: {
        default: 'team-notifications',
        urgent: 'urgent-requests'
      }
    },
    email: {
      enabled: true,
      include_manager: ['high', 'urgent'],
      templates: {
        standard: 'task-assignment',
        urgent: 'urgent-assignment'
      }
    }
  },
  reassignment_triggers: {
    workload_threshold: 0.8,
    deadline_conflict: true,
    skill_mismatch: true
  }
};
```

## Monitoring

```typescript
interface AssignmentMetrics {
  assignments_processed: number;
  reassignments_requested: number;
  average_response_time: number;
  workload_distribution: Record<string, number>;
  completion_rates: Record<string, number>;
}

// Add to agent class
class ClickUpAssignmentAgent {
  private metrics: AssignmentMetrics;

  async collectMetrics(): Promise<void> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Get assignment metrics
    const metrics = await this.tools.execute(
      Action.CLICKUP_GET_METRICS,
      {
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      }
    );

    // Update metrics
    this.metrics = {
      assignments_processed: metrics.totalAssignments,
      reassignments_requested: metrics.reassignments,
      average_response_time: metrics.avgResponseTime,
      workload_distribution: metrics.workloadByUser,
      completion_rates: metrics.completionRates
    };

    // Store metrics
    await this.storeMetrics(this.metrics);
  }
}
```

## Best Practices

1. **Workload Management:**
   - Regular workload assessment
   - Fair task distribution
   - Priority balancing
   - Deadline conflict prevention

2. **Communication:**
   - Clear assignment notifications
   - Context-rich updates
   - Appropriate urgency levels
   - Feedback collection

3. **Resource Optimization:**
   - Skill-based assignment
   - Time block allocation
   - Resource availability tracking
   - Capacity planning

4. **Performance:**
   - Cache workload data
   - Batch notifications
   - Efficient API usage
   - Regular cache updates

5. **Monitoring:**
   - Workload metrics
   - Assignment patterns
   - Completion rates
   - Response times