import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { KnowledgeBaseStatus } from '@/hooks/use-batch-knowledge-base';

interface BatchIndexingActionsProps {
  selectedCount: number;
  knowledgeBaseStatus: KnowledgeBaseStatus;
  onCreateKnowledgeBase: () => void;
  onTriggerSync: () => void;
}

export function BatchIndexingActions({
  selectedCount,
  knowledgeBaseStatus,
  onCreateKnowledgeBase,
  onTriggerSync,
}: BatchIndexingActionsProps) {
  
  const getStatusIcon = () => {
    switch (knowledgeBaseStatus) {
      case 'creating':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'syncing':
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'synced':
        return <Check className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Plus className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    switch (knowledgeBaseStatus) {
      case 'creating':
        return 'Adding to KB...';
      case 'created':
        return 'Added to Knowledge Base';
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return 'Synced Successfully';
      case 'error':
        return 'Error Occurred';
      default:
        return `Add to knowledge base (${selectedCount})`;
    }
  };

  const renderActions = () => {
    switch (knowledgeBaseStatus) {
      case 'none':
        // Initial state - show "Index Selected" button
        return (
          <Button
            onClick={onCreateKnowledgeBase}
            disabled={selectedCount === 0}
            className="flex items-center gap-2"
          >
            {getStatusIcon()}
            {getStatusText()}
          </Button>
        );

      case 'creating':
        // Creating KB - show loading state
        return (
          <Button disabled className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusText()}
          </Button>
        );

      case 'created':
        // Files added to KB - show "Sync" button
        return (
          <Button
            onClick={onTriggerSync}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Sync Knowledge Base
          </Button>
        );

      case 'syncing':
        // Syncing - show loading state
        return (
          <Button disabled className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusText()}
          </Button>
        );

      case 'synced':
        // Synced successfully - show success state
        return (
          <Button disabled className="flex items-center gap-2 bg-green-600 hover:bg-green-600">
            {getStatusIcon()}
            {getStatusText()}
          </Button>
        );

      case 'error':
        // Error state - allow retry
        return (
          <Button
            onClick={onCreateKnowledgeBase}
            variant="destructive"
            disabled={selectedCount === 0}
            className="flex items-center gap-2"
          >
            {getStatusIcon()}
            Retry Add to KB
          </Button>
        );

      default:
        return null;
    }
  };

  return renderActions();
}