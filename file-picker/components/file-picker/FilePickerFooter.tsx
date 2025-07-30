'use client';

import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilePickerFooterProps {
  selectedCount: number;
  onCancel: () => void;
  onSelect: () => void;
}

export function FilePickerFooter({
  selectedCount,
  onCancel,
  onSelect,
}: FilePickerFooterProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
      {/* Left Side - Recommendation */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <Info className="w-4 h-4 text-gray-400" />
        <span>We recommend selecting as few items as needed.</span>
      </div>
      
      {/* Right Side - Action Buttons */}
      <div className="flex items-center space-x-3">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onCancel}
          className="text-gray-600"
        >
          Cancel
        </Button>
        
        <Button 
          size="sm"
          onClick={onSelect}
          disabled={selectedCount === 0}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          Select {selectedCount}
        </Button>
      </div>
    </div>
  );
} 