'use client';

import { 
  Files, 
  Globe, 
  Type, 
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface IntegrationSidebarProps {
  googleDriveFileCount?: number;
  onIntegrationClick?: (id: string) => void;
  activeIntegration?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface Integration {
  id: string;
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
  imageSrc?: string;
  count: number;
  active: boolean;
  hasImage: boolean;
}

export function IntegrationSidebar({ 
  googleDriveFileCount = 0,
  onIntegrationClick,
  activeIntegration = 'googledrive',
  collapsed = false,
  onToggleCollapse
}: IntegrationSidebarProps) {
  const integrations: Integration[] = [
    { id: 'files', name: 'Files', icon: Files, count: 0, active: false, hasImage: false },
    { id: 'websites', name: 'Websites', icon: Globe, count: 0, active: false, hasImage: false },
    { id: 'text', name: 'Text', icon: Type, count: 0, active: false, hasImage: false },
    { 
      id: 'confluence', 
      name: 'Confluence', 
      imageSrc: '/assets/confluence.png',
      count: 0, 
      active: false, 
      hasImage: true 
    },
    { 
      id: 'notion', 
      name: 'Notion', 
      imageSrc: '/assets/notion.png',
      count: 0, 
      active: false, 
      hasImage: true 
    },
    { 
      id: 'googledrive', 
      name: 'Google Drive', 
      imageSrc: '/assets/google-drive.png',
      count: googleDriveFileCount, 
      active: true, 
      hasImage: true 
    },
    { 
      id: 'onedrive', 
      name: 'OneDrive', 
      imageSrc: '/assets/onedrive.png',
      count: 0, 
      active: false, 
      hasImage: true 
    },
    { 
      id: 'sharepoint', 
      name: 'SharePoint', 
      imageSrc: '/assets/sharepoint.png',
      count: 0, 
      active: false, 
      hasImage: true 
    },
    { 
      id: 'slack', 
      name: 'Slack', 
      imageSrc: '/assets/slack.png',
      count: 0, 
      active: false, 
      hasImage: true 
    },
  ];

  return (
    <div className={cn(
      "bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Header */}
      <div className="px-4 py-5 border-b border-gray-200 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center">
            <Image
              src="/stackai-logo.png"
              alt="Stack AI Logo"
              width={100}
              height={100}
              className="object-contain"
            />
          </div>
        )}
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="w-6 h-6 p-0"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            )}
          </Button>
        )}
      </div>
      
      {/* Integration List */}
      <div className="flex-1 px-3 py-3">
        <div className="space-y-1">
          {integrations.map((integration) => {
            const IconComponent = integration.icon;
            const isActive = activeIntegration === integration.id;
            
            return (
              <div
                key={integration.id}
                onClick={() => onIntegrationClick?.(integration.id)}
                className={cn(
                  "flex items-center justify-between px-3 py-3 rounded-md text-sm cursor-pointer transition-colors",
                  isActive 
                    ? "bg-gray-200 text-gray-900" 
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
                title={collapsed ? integration.name : undefined}
              >
                <div className="flex items-center space-x-3">
                  {integration.hasImage && integration.imageSrc ? (
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                      <Image
                        src={integration.imageSrc}
                        alt={`${integration.name} logo`}
                        width={20}
                        height={20}
                        className="object-contain"
                      />
                    </div>
                  ) : IconComponent ? (
                    <IconComponent className="w-5 h-5 flex-shrink-0" />
                  ) : null}
                  {!collapsed && (
                    <span className="font-medium">{integration.name}</span>
                  )}
                </div>
                {!collapsed && (
                  <span className="text-xs text-gray-500">{integration.count}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 