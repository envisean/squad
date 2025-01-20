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
} from 'recharts';
import { AgentMonitor } from '@squad/core';

interface DashboardProps {
  monitor: AgentMonitor;
  agentId: string;
}

export function MonitoringDashboard({ monitor, agentId }: DashboardProps) {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState('1h');

  useEffect(() => {
    const fetchData = async () => {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - getTimeRangeMs(timeRange));

      const [newMetrics, newLogs] = await Promise.all([
        monitor.queryMetrics({
          startTime,
          endTime,
          labels: { agentId }
        }),
        monitor.queryLogs({
          startTime,
          endTime,
          search: agentId
        })
      ]);

      setMetrics(newMetrics);
      setLogs(newLogs);
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, [monitor, agentId, timeRange]);

  const getTimeRangeMs = (range: string): number => {
    const units: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    };
    return units[range] || units['1h'];
  };

  return (
    <div className="space-y-4 p-4">
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

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Tasks Completed"
          value={metrics.filter(m => m.name === 'tasks_completed').length}
          description="Total tasks completed in period"
        />
        <MetricCard
          title="Average Response Time"
          value={`${calculateAverageResponseTime(metrics)}ms`}
          description="Average time to complete tasks"
        />
        <MetricCard
          title="Error Rate"
          value={`${calculateErrorRate(metrics)}%`}
          description="Percentage of failed tasks"
        />
        <MetricCard
          title="Memory Usage"
          value={`${calculateMemoryUsage(metrics)}MB`}
          description="Current memory consumption"
        />
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>Response time and task completion rate over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formatMetricsForChart(metrics)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="responseTime"
                  stroke="#8884d8"
                  name="Response Time (ms)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="completionRate"
                  stroke="#82ca9d"
                  name="Completion Rate (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Log Viewer */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Logs</CardTitle>
          <CardDescription>Latest agent activity and errors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-2 rounded ${
                  log.level === 'error'
                    ? 'bg-red-100 dark:bg-red-900'
                    : 'bg-secondary'
                }`}
              >
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`px-2 rounded ${
                    log.level === 'error'
                      ? 'bg-red-200 dark:bg-red-800'
                      : 'bg-secondary-foreground/10'
                  }`}>
                    {log.level}
                  </span>
                </div>
                <p className="mt-1">{log.message}</p>
                {log.context && (
                  <pre className="mt-2 text-xs bg-background/50 p-2 rounded">
                    {JSON.stringify(log.context, null, 2)}
                  </pre>
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

// Utility functions for calculations
function calculateAverageResponseTime(metrics: any[]): number {
  const responseTimes = metrics
    .filter(m => m.name === 'response_time')
    .map(m => m.value);
  return Math.round(
    responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0
  );
}

function calculateErrorRate(metrics: any[]): number {
  const total = metrics.filter(m => m.name === 'task_completion').length;
  const errors = metrics.filter(m => m.name === 'task_error').length;
  return Math.round((errors / total) * 100) || 0;
}

function calculateMemoryUsage(metrics: any[]): number {
  const latest = metrics
    .filter(m => m.name === 'memory_usage')
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  return Math.round(latest?.value || 0);
}

function formatMetricsForChart(metrics: any[]) {
  // Group metrics by timestamp (rounded to minute)
  const grouped = metrics.reduce((acc, metric) => {
    const timestamp = new Date(metric.timestamp);
    timestamp.setSeconds(0, 0);
    const key = timestamp.toISOString();

    if (!acc[key]) {
      acc[key] = {
        timestamp: timestamp.toLocaleTimeString(),
        responseTime: 0,
        completionRate: 0,
        count: 0,
      };
    }

    if (metric.name === 'response_time') {
      acc[key].responseTime += metric.value;
      acc[key].count += 1;
    }

    return acc;
  }, {});

  // Calculate averages and format for chart
  return Object.values(grouped).map((group: any) => ({
    ...group,
    responseTime: group.responseTime / group.count || 0,
  }));
}