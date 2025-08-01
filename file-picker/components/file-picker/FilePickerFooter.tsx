'use client';

import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BatchIndexingActions } from '@/components/file-picker/BatchIndexingActions';
import { KnowledgeBaseStatus } from '@/hooks/use-batch-knowledge-base';

interface FilePickerFooterProps {
  selectedCount: number;
  onCancel: () => void;
  // Batch knowledge base props
  knowledgeBaseStatus: KnowledgeBaseStatus;
  onCreateKnowledgeBase: () => void;
  onTriggerSync: () => void;
}

export function FilePickerFooter({
  selectedCount,
  onCancel,
  knowledgeBaseStatus,
  onCreateKnowledgeBase,
  onTriggerSync,
}: FilePickerFooterProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
      {/* Left Side - Recommendation */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Info className="w-4 h-4 text-gray-400" />
        <span>We recommend selecting as few items as needed.</span>
      </div>
      
      {/* Right Side - Batch Actions */}
      <div className="flex items-center space-x-3">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onCancel}
          className="text-gray-600"
        >
          Cancel
        </Button>
        
        <BatchIndexingActions
          selectedCount={selectedCount}
          knowledgeBaseStatus={knowledgeBaseStatus}
          onCreateKnowledgeBase={onCreateKnowledgeBase}
          onTriggerSync={onTriggerSync}
        />
      </div>
    </div>
  );
} 