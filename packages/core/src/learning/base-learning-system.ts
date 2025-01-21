import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { Experience, Knowledge, Pattern, Insight, MemoryType } from './types';
import { MemoryStream } from './memory-stream';

export interface LearningSystemConfig {
  supabaseUrl: string;
  supabaseKey: string;
  openaiApiKey: string;
  agentId: string;
  environment: string;
}

export class BaseLearningSystem {
  protected supabase: SupabaseClient;
  protected embeddings: OpenAIEmbeddings;
  protected streams: Map<MemoryType, MemoryStream>;
  protected config: LearningSystemConfig;

  constructor(config: LearningSystemConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.openaiApiKey
    });
    this.streams = new Map();
  }

  async initialize(): Promise<void> {
    // Initialize memory streams
    await this.initializeStreams();
  }

  protected async initializeStreams(): Promise<void> {
    // Create memory streams for each type
    for (const type of Object.values(MemoryType)) {
      this.streams.set(
        type,
        new MemoryStream(this.supabase, this.embeddings, {
          type,
          agentId: this.config.agentId,
          environment: this.config.environment
        })
      );
    }
  }

  async processExperience(experience: Experience): Promise<void> {
    try {
      // Log raw experience
      await this.logRawExperience(experience);

      // Process into different memory streams
      await Promise.all([
        this.processEpisodicMemory(experience),
        this.processSemanticMemory(experience),
        this.processProcedural(experience),
        this.processRelationships(experience)
      ]);

      // Look for patterns
      await this.identifyPatterns(experience);

    } catch (error) {
      console.error('Error processing experience:', error);
      throw error;
    }
  }

  protected async logRawExperience(experience: Experience): Promise<void> {
    await this.supabase.from('raw_experiences').insert({
      id: experience.id,
      type: experience.type,
      content: experience.content,
      actions: experience.actions,
      outcomes: experience.outcomes,
      metadata: experience.metadata,
      context: {
        ...experience.context,
        agent_id: this.config.agentId,
        environment: this.config.environment
      },
      timestamp: new Date()
    });
  }

  protected async processEpisodicMemory(experience: Experience): Promise<void> {
    const stream = this.streams.get('episodic');
    if (!stream) throw new Error('Episodic stream not initialized');
    await stream.store(experience);
  }

  protected async processSemanticMemory(experience: Experience): Promise<void> {
    const stream = this.streams.get('semantic');
    if (!stream) throw new Error('Semantic stream not initialized');
    
    // Extract knowledge from experience
    const knowledge = await this.extractKnowledge(experience);
    if (knowledge) {
      await stream.store(knowledge);
    }
  }

  protected async processProcedural(experience: Experience): Promise<void> {
    const stream = this.streams.get('procedural');
    if (!stream) throw new Error('Procedural stream not initialized');
    
    // Update procedural memory based on actions and outcomes
    if (experience.actions.length > 0) {
      await stream.store({
        ...experience,
        type: 'procedural'
      });
    }
  }

  protected async processRelationships(experience: Experience): Promise<void> {
    const stream = this.streams.get('relationship');
    if (!stream) throw new Error('Relationship stream not initialized');
    
    // Extract and store relationship information
    const relationships = await this.extractRelationships(experience);
    if (relationships) {
      await stream.store(relationships);
    }
  }

  protected async identifyPatterns(experience: Experience): Promise<void> {
    // Query recent similar experiences
    const similarExperiences = await this.findSimilarExperiences(experience);
    
    if (similarExperiences.length > 0) {
      // Look for patterns in similar experiences
      const patterns = await this.findPatterns(similarExperiences);
      
      // Store new patterns
      await this.storePatterns(patterns);
    }
  }

  protected async findSimilarExperiences(experience: Experience): Promise<Experience[]> {
    const stream = this.streams.get('episodic');
    if (!stream) throw new Error('Episodic stream not initialized');
    
    return stream.query({
      content: experience.content,
      limit: 10,
      timeframe: '7d'
    });
  }

  protected async findPatterns(experiences: Experience[]): Promise<Pattern[]> {
    // Implement pattern recognition logic
    // This could use LLMs or traditional ML approaches
    return [];
  }

  protected async storePatterns(patterns: Pattern[]): Promise<void> {
    if (patterns.length === 0) return;

    await this.supabase.from('patterns').insert(
      patterns.map(pattern => ({
        ...pattern,
        created_at: new Date(),
        agent_id: this.config.agentId
      }))
    );
  }

  protected async extractKnowledge(experience: Experience): Promise<Knowledge | null> {
    // Implement knowledge extraction logic
    // This could use LLMs to extract general knowledge from specific experiences
    return null;
  }

  protected async extractRelationships(experience: Experience): Promise<any> {
    // Implement relationship extraction logic
    // This could identify people, roles, and relationships from experiences
    return null;
  }

  // Query methods
  async queryKnowledge(query: string, type?: MemoryType): Promise<Knowledge[]> {
    const stream = type ? this.streams.get(type) : this.streams.get('semantic');
    if (!stream) throw new Error('Stream not initialized');
    
    return stream.query({ content: query });
  }

  async queryExperiences(query: string): Promise<Experience[]> {
    const stream = this.streams.get('episodic');
    if (!stream) throw new Error('Episodic stream not initialized');
    
    return stream.query({ content: query });
  }

  async queryPatterns(query: string): Promise<Pattern[]> {
    // Query patterns based on similarity
    const { data, error } = await this.supabase
      .from('patterns')
      .select('*')
      .textSearch('pattern', query);

    if (error) throw error;
    return data;
  }
}