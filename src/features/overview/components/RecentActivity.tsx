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
    <Card className="bg-[#14171C] border-[#242831] overflow-hidden">
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#1F242C]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-[#F5F7FA] uppercase tracking-wider">
            Recent Pipeline Activity
          </h3>
        </div>
        <Link
          to="/pipelines"
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          View all executions →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <Table className="border-none rounded-none">
          <TableHeader>
            <TableRow className="border-b border-[#242831]">
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
              <TableRow key={act.id} className="hover:bg-[#181B22]/70">
                <TableCell className="font-mono text-xs text-[#9CA3AF]">
                  {act.time}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs font-semibold text-[#F5F7FA] hover:text-indigo-400 cursor-pointer transition-colors">
                    {act.pipeline}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-[#9CA3AF]">
                  {act.event}
                </TableCell>
                <TableCell className="text-xs font-mono text-[#6B7280]">
                  {act.recordsProcessed || '—'}
                </TableCell>
                <TableCell className="text-xs font-mono text-[#6B7280]">
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
