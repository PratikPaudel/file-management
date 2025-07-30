'use client';

import { ChevronRight, Home } from 'lucide-react';
import { Breadcrumb } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface BreadcrumbNavProps {
  breadcrumbs: Breadcrumb[];
  onBreadcrumbClick: (index: number) => void;
}

export function BreadcrumbNav({ breadcrumbs, onBreadcrumbClick }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center space-x-1 text-sm">
      {breadcrumbs.map((breadcrumb, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onBreadcrumbClick(index)}
            className="h-auto p-2 text-gray-600 hover:text-gray-900"
          >
            {index === 0 && <Home className="w-4 h-4 mr-1" />}
            {breadcrumb.name}
          </Button>
        </div>
      ))}
    </nav>
  );
} 