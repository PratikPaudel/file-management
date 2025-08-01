import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IndexingStatus } from '@/hooks/use-file-indexing';


interface SimpleIndexingActionsProps {
  status: IndexingStatus;
  onUnindex: () => void;
}

export function SimpleIndexingActions({
  status,
  onUnindex,
}: SimpleIndexingActionsProps) {
  if (status === 'indexing' || status === 'unindexing') {
    // Show nothing while processing
    return null;
  }

  if (status === 'indexed' || status === 'synced') {
    // Show unindex button
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={onUnindex}
        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    );
  }

  if (status === 'not_indexed') {
    // Show index button
    return null;
  }

  // For any other status, show nothing
  return null;
}