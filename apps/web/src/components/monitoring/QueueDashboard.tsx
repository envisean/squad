import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@squad/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { ControlPlane } from '@squad/core';

interface QueueMetrics {
  pendingTasks: number;
  processingTasks: number;
  failedTasks: number;
  completedTasks: number;
  retryingTasks: number;
  avgProcessingTime: number;
  criticalTasks: number;
  highPriorityTasks: number;
}

interface QueueDashboardProps {
  agentId: string;
}

export function QueueDashboard({ agentId }: QueueDashboardProps) {
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState('1h');
  const supabase = useSupabaseClient();

  useEffect(() => {
    const controlPlane = new ControlPlane({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    });

    // Fetch initial metrics
    const fetchMetrics = async () => {
      const metrics = await controlPlane.getQueueMetrics(agentId);
      setMetrics(metrics);
    };

    // Fetch historical data
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('queue_metrics_view')
        .select('*')
        .eq('agent_id', agentId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (!error && data) {
        setHistory(data);
      }
    };

    // Set up real-time subscription
    const subscription = supabase
      .channel('queue-metrics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_metrics_view',
          filter: `agent_id=eq.${agentId}`
        },
        (payload) => {
          setMetrics(payload.new as QueueMetrics);
          setHistory(current => [payload.new, ...current.slice(0, 99)]);
        }
      )
      .subscribe();

    fetchMetrics();
    fetchHistory();

    return () => {
      subscription.unsubscribe();
    };
  }, [agentId, timeRange]);

  if (!metrics) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      <div className="flex justify-end space-x-2">
        {['1h', '6h', '24h', '7d'].map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1 rounded ${
              timeRange === range
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Current Queue Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Queue Depth"
          value={metrics.pendingTasks}
          description="Tasks waiting to be processed"
        />
        <MetricCard
          title="Processing"
          value={metrics.processingTasks}
          description="Tasks currently being processed"
        />
        <MetricCard
          title="Avg Processing Time"
          value={`${Math.round(metrics.avgProcessingTime)}ms`}
          description="Average task processing time"
        />
        <MetricCard
          title="Error Rate"
          value={`${Math.round(
            (metrics.failedTasks / 
              (metrics.completedTasks + metrics.failedTasks)) * 100
          )}%`}
          description="Task failure rate"
        />
      </div>

      {/* Queue Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Trends</CardTitle>
          <CardDescription>Task volume over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="pendingTasks"
                  stroke="#8884d8"
                  name="Pending"
                />
                <Line
                  type="monotone"
                  dataKey="processingTasks"
                  stroke="#82ca9d"
                  name="Processing"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Priority Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Priority Distribution</CardTitle>
          <CardDescription>Tasks by priority level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{
                critical: metrics.criticalTasks,
                high: metrics.highPriorityTasks,
                medium: metrics.pendingTasks - metrics.criticalTasks - metrics.highPriorityTasks,
                low: metrics.retryingTasks
              }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="critical" fill="#ef4444" name="Critical" />
                <Bar dataKey="high" fill="#f97316" name="High" />
                <Bar dataKey="medium" fill="#eab308" name="Medium" />
                <Bar dataKey="low" fill="#22c55e" name="Low" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tasks</CardTitle>
          <CardDescription>Latest tasks in the queue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {history.slice(0, 10).map((task) => (
              <div
                key={task.id}
                className={`p-2 rounded ${
                  task.status === 'failed'
                    ? 'bg-red-100 dark:bg-red-900'
                    : 'bg-secondary'
                }`}
              >
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    {new Date(task.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`px-2 rounded ${
                    task.priority === 'critical'
                      ? 'bg-red-200 dark:bg-red-800'
                      : 'bg-secondary-foreground/10'
                  }`}>
                    {task.priority}
                  </span>
                </div>
                <p className="mt-1">{task.type}</p>
                {task.error && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {task.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  description
}: {
  title: string;
  value: string | number;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}