import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { RecentActivityItem } from '../types';
import { Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface RecentActivityProps {
  activities: RecentActivityItem[];
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
  const getStatusBadge = (status: RecentActivityItem['status'], event: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="success" dot size="sm">
            Completed
          </Badge>
        );
      case 'started':
        return (
          <Badge variant="info" dot pulse size="sm">
            Running
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="warning" dot size="sm">
            Warning
          </Badge>
        );
      case 'auto_healed':
        return (
          <Badge variant="ai" dot size="sm">
            Auto-Healed
          </Badge>
        );
      case 'schema_updated':
        return (
          <Badge variant="neutral" dot size="sm">
            Schema Synced
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            {event}
          </Badge>
        );
    }
  };

  return (
    <Card className="bg-card border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
            Recent Pipeline Activity
          </h3>
        </div>
        <Link
          to="/pipelines"
          className="text-xs text-indigo-600 hover:text-indigo-600 font-medium transition-colors"
        >
          View all executions →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <Table className="border-none rounded-none">
          <TableHeader>
            <TableRow className="border-b border-border">
              <TableHead className="w-24">Time</TableHead>
              <TableHead>Pipeline</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Throughput</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((act) => (
              <TableRow key={act.id} className="hover:bg-card-active">
                <TableCell className="font-mono text-xs text-text-secondary">
                  {act.time}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs font-semibold text-text-primary hover:text-indigo-600 cursor-pointer transition-colors">
                    {act.pipeline}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-text-secondary">
                  {act.event}
                </TableCell>
                <TableCell className="text-xs font-mono text-text-muted">
                  {act.recordsProcessed || '—'}
                </TableCell>
                <TableCell className="text-xs font-mono text-text-muted">
                  {act.duration || '—'}
                </TableCell>
                <TableCell className="text-right">
                  {getStatusBadge(act.status, act.event)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
