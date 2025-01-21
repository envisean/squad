import { BaseLearningSystem } from '../base-learning-system';
import { Experience } from '../types';
import { v4 as uuidv4 } from 'uuid';

describe('Learning System', () => {
  let learningSystem: BaseLearningSystem;

  beforeAll(() => {
    learningSystem = new BaseLearningSystem({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      openaiApiKey: process.env.OPENAI_API_KEY!,
      agentId: 'test-agent',
      environment: 'test'
    });
  });

  beforeEach(async () => {
    await learningSystem.initialize();
  });

  it('should process and store an experience', async () => {
    const experience: Experience = {
      id: uuidv4(),
      type: 'email_processing',
      timestamp: new Date(),
      content: {
        subject: 'Test Email',
        body: 'This is a test email for processing.',
        from: 'test@example.com'
      },
      actions: [
        {
          type: 'classification',
          result: { category: 'test', confidence: 0.95 },
          timestamp: new Date()
        }
      ],
      outcomes: [
        {
          type: 'processed',
          result: { success: true },
          timestamp: new Date()
        }
      ],
      metadata: {
        source: 'test'
      },
      context: {
        agent_id: 'test-agent',
        environment: 'test'
      }
    };

    await expect(
      learningSystem.processExperience(experience)
    ).resolves.not.toThrow();

    // Query the experience back
    const experiences = await learningSystem.queryExperiences('test email');
    expect(experiences).toHaveLength(1);
    expect(experiences[0].content).toMatchObject({
      subject: 'Test Email'
    });
  });

  it('should identify patterns across experiences', async () => {
    // Create multiple similar experiences
    const experiences = Array.from({ length: 3 }, (_, i) => ({
      id: uuidv4(),
      type: 'email_processing',
      timestamp: new Date(),
      content: {
        subject: `Meeting Reminder ${i + 1}`,
        body: 'Please confirm your attendance.',
        from: 'calendar@example.com'
      },
      actions: [
        {
          type: 'classification',
          result: { category: 'meeting', confidence: 0.95 },
          timestamp: new Date()
        }
      ],
      outcomes: [
        {
          type: 'processed',
          result: { success: true },
          timestamp: new Date()
        }
      ],
      metadata: {
        source: 'test'
      },
      context: {
        agent_id: 'test-agent',
        environment: 'test'
      }
    }));

    // Process all experiences
    for (const experience of experiences) {
      await learningSystem.processExperience(experience);
    }

    // Query for patterns
    const patterns = await learningSystem.queryPatterns('meeting');
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].type).toBe('email_pattern');
    expect(patterns[0].confidence).toBeGreaterThan(0.5);
  });

  it('should build semantic knowledge from experiences', async () => {
    const experience: Experience = {
      id: uuidv4(),
      type: 'email_processing',
      timestamp: new Date(),
      content: {
        subject: 'Project Update',
        body: 'The new feature will be released next week.',
        from: 'team@example.com'
      },
      actions: [
        {
          type: 'classification',
          result: { category: 'project', confidence: 0.95 },
          timestamp: new Date()
        }
      ],
      outcomes: [
        {
          type: 'processed',
          result: { success: true },
          timestamp: new Date()
        }
      ],
      metadata: {
        source: 'test'
      },
      context: {
        agent_id: 'test-agent',
        environment: 'test'
      }
    };

    await learningSystem.processExperience(experience);

    // Query semantic knowledge
    const knowledge = await learningSystem.queryKnowledge('project update');
    expect(knowledge.length).toBeGreaterThan(0);
    expect(knowledge[0].type).toBe('semantic');
    expect(knowledge[0].confidence).toBeGreaterThan(0);
  });
});