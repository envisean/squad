import { createClient } from '@supabase/supabase-js';
import { 
  MonitoringConfig,
  Metric,
  LogEntry,
  ConversationLog,
  DecisionLog,
  ActionLog
} from './types';

export class AgentMonitor {
  private supabase;
  private config: MonitoringConfig;
  private metricsBuffer: Metric[] = [];
  private flushInterval: NodeJS.Timer;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.supabase = createClient(
      config.storage.config.url as string,
      config.storage.config.key as string
    );

    // Set up periodic metrics flushing
    this.flushInterval = setInterval(
      () => this.flushMetrics(),
      config.metrics.interval * 1000
    );
  }

  // Metrics Collection
  async recordMetric(metric: Omit<Metric, 'timestamp'>): Promise<void> {
    const fullMetric: Metric = {
      ...metric,
      timestamp: new Date()
    };

    this.metricsBuffer.push(fullMetric);

    // Flush if buffer gets too large
    if (this.metricsBuffer.length >= 100) {
      await this.flushMetrics();
    }
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      const { error } = await this.supabase
        .from('agent_metrics')
        .insert(metrics);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Re-add metrics to buffer
      this.metricsBuffer.unshift(...metrics);
    }
  }

  // Logging
  async log(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
    const fullEntry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...entry
    };

    if (this.shouldLog(entry.level)) {
      await this.storeLog(fullEntry);
    }
  }

  private shouldLog(level: LogEntry['level']): boolean {
    const levels: Record<string, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      critical: 4
    };

    return levels[level] >= levels[this.config.logLevel];
  }

  // Conversation Logging
  async logConversation(log: Omit<ConversationLog, 'id' | 'timestamp'>): Promise<void> {
    const fullLog: ConversationLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...log
    };

    const { error } = await this.supabase
      .from('conversation_logs')
      .insert(fullLog);

    if (error) throw error;
  }

  // Decision Logging
  async logDecision(log: Omit<DecisionLog, 'id' | 'timestamp'>): Promise<void> {
    const fullLog: DecisionLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...log
    };

    const { error } = await this.supabase
      .from('decision_logs')
      .insert(fullLog);

    if (error) throw error;
  }

  // Action Logging
  async logAction(log: Omit<ActionLog, 'id' | 'timestamp'>): Promise<void> {
    const fullLog: ActionLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      ...log
    };

    const { error } = await this.supabase
      .from('action_logs')
      .insert(fullLog);

    if (error) throw error;
  }

  // Query Interface
  async queryMetrics(options: {
    startTime?: Date;
    endTime?: Date;
    names?: string[];
    labels?: Record<string, string>;
  }): Promise<Metric[]> {
    let query = this.supabase
      .from('agent_metrics')
      .select('*');

    if (options.startTime) {
      query = query.gte('timestamp', options.startTime.toISOString());
    }

    if (options.endTime) {
      query = query.lte('timestamp', options.endTime.toISOString());
    }

    if (options.names?.length) {
      query = query.in('name', options.names);
    }

    if (options.labels) {
      query = query.contains('labels', options.labels);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async queryLogs(options: {
    startTime?: Date;
    endTime?: Date;
    level?: LogEntry['level'];
    category?: string;
    search?: string;
  }): Promise<LogEntry[]> {
    let query = this.supabase
      .from('agent_logs')
      .select('*');

    if (options.startTime) {
      query = query.gte('timestamp', options.startTime.toISOString());
    }

    if (options.endTime) {
      query = query.lte('timestamp', options.endTime.toISOString());
    }

    if (options.level) {
      query = query.eq('level', options.level);
    }

    if (options.category) {
      query = query.eq('category', options.category);
    }

    if (options.search) {
      query = query.ilike('message', `%${options.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Clear flush interval
    clearInterval(this.flushInterval);

    // Flush any remaining metrics
    await this.flushMetrics();

    // Clean up old data based on retention policy
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.config.metrics.retention);

    const tables = [
      'agent_metrics',
      'agent_logs',
      'conversation_logs',
      'decision_logs',
      'action_logs'
    ];

    await Promise.all(
      tables.map(table =>
        this.supabase
          .from(table)
          .delete()
          .lt('timestamp', cutoff.toISOString())
      )
    );
  }
}