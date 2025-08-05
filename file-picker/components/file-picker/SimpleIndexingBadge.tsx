import { Loader2, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { IndexingStatus } from '@/lib/types';

interface SimpleIndexingBadgeProps {
  status: IndexingStatus;
}

export function SimpleIndexingBadge({ status }: SimpleIndexingBadgeProps) {
  switch (status) {
    case 'indexed':
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
          <Check className="w-3 h-3 mr-1" />
          Added to KB
        </Badge>
      );

    case 'indexing':
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Adding to KB...
        </Badge>
      );
    case 'unindexing':
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Removing...
        </Badge>
      );
    case 'not-indexed':
    default:
      return (
        <Badge variant="outline" className="text-gray-600">
          not indexed
        </Badge>
      );
  }
}