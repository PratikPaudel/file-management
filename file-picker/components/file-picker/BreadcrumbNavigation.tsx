'use client';

import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BreadcrumbItem {
  name: string;
  path: string;
  resourceId?: string;
}

interface BreadcrumbNavigationProps {
  breadcrumbs: BreadcrumbItem[];
  onNavigateTo: (index: number) => void;
}

export function BreadcrumbNavigation({ breadcrumbs, onNavigateTo }: BreadcrumbNavigationProps) {
  return (
    <div className="flex items-center space-x-1">      
      {breadcrumbs.map((breadcrumb, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigateTo(index)}
            className={`h-auto p-1 text-sm font-medium transition-colors ${
              index === breadcrumbs.length - 1 
                ? 'text-gray-900 cursor-default' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
            disabled={index === breadcrumbs.length - 1}
          >
            {index === 0 && <Home className="w-4 h-4 mr-1" />}
            {index === 0 ? 'My Drive' : breadcrumb.name}
          </Button>
        </div>
      ))}
    </div>
  );
} 