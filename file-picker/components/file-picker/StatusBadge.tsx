'use client';

import { Badge } from '@/components/ui/badge';
import { IndexingStatus } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface StatusBadgeProps {
  status: IndexingStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusText = (status: IndexingStatus) => {
    switch (status) {
      case 'indexed':
        return 'Indexed';
      case 'indexing':
        return 'Indexing';
      case 'not-indexed':
        return 'Not Indexed';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const getStatusVariant = (status: IndexingStatus) => {
    switch (status) {
      case 'indexed':
        return 'default'; // Green
      case 'indexing':
        return 'secondary'; // Amber/Orange
      case 'not-indexed':
        return 'outline'; // Gray
      case 'error':
        return 'destructive'; // Red
      default:
        return 'outline';
    }
  };

  return (
    <Badge variant={getStatusVariant(status)} className="text-xs">
      {status === 'indexing' && (
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      )}
      {getStatusText(status)}
    </Badge>
  );
} 