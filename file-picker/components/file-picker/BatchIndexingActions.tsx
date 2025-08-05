
import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';

interface BatchIndexingActionsProps {
  selectedCount: number;
  onAddResources: () => void;
  isLoading: boolean;
}

export function BatchIndexingActions({
  selectedCount,
  onAddResources,
  isLoading,
}: BatchIndexingActionsProps) {
  return (
    <Button
      onClick={onAddResources}
      disabled={selectedCount === 0 || isLoading}
      className="flex items-center gap-2"
    >
      {isLoading ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <Plus className="h-4 w-4" />
      )}
      {isLoading ? 'Adding...' : `Add to knowledge base (${selectedCount})`}
    </Button>
  );
}
