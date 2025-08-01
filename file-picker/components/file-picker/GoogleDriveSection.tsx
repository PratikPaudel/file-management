'use client';

import { ChevronDown, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GoogleDriveSectionProps {
  fileCount: number;
  isExpanded: boolean;
  canGoBack?: boolean;
  onGoBack?: () => void;
  currentPath?: string;
}

export function GoogleDriveSection({ 
  fileCount, 
  isExpanded,
  canGoBack = false,
  onGoBack,
  currentPath = ''
}: GoogleDriveSectionProps) {
  return (
    <div className="px-6 py-3 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {/* Back Button or Expand/Collapse Arrow */}
          {canGoBack ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onGoBack}
              className="w-6 h-6 p-0"
            >
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </Button>
          ) : (
            <ChevronDown 
              className={cn(
                "w-4 h-4 text-gray-400 transition-transform",
                !isExpanded && "-rotate-90"
              )} 
            />
          )}
          
          {/* Google Drive Icon */}
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285f4" d="M6 2l6 10.5-6 10.5z"/>
            <path fill="#ea4335" d="M6 2L18 2l-6 10.5z"/>
            <path fill="#34a853" d="M6 23h12l-6-10.5z"/>
          </svg>
          
          {/* Account Info */}
          <div>
            <div className="text-sm font-medium text-gray-900">
              Google Drive {currentPath && `/ ${currentPath}`}
            </div>
                          <div className="text-xs text-gray-500">stackaitest@gmail.com</div>
          </div>
        </div>
        
        {/* Right Side - Just Count */}
        <div className="flex items-center">
          <span className="text-sm text-gray-500">Total: {fileCount}</span>
        </div>
      </div>
    </div>
  );
} 