'use client';

import { useState, useEffect } from 'react';
import { FilePicker } from '@/components/file-picker/FilePicker';
import { IntegrationSidebar } from '@/components/file-picker/IntegrationSidebar';
import { useConnections, useConnectionFiles } from '@/hooks/use-connection';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [activeIntegration, setActiveIntegration] = useState('googledrive');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);


  
  // Fetch available connections
  const { data: connections, isLoading: connectionsLoading, error: connectionsError } = useConnections();

  // Fetch root files to get count for sidebar
  const { data: rootFilesData } = useConnectionFiles({
    connectionId: selectedConnectionId,
    resourceId: undefined,
  });



  // Auto-select first connection when available
  useEffect(() => {
    if (connections && connections.length > 0 && !selectedConnectionId) {
      setSelectedConnectionId(connections[0].id);
    }
  }, [connections, selectedConnectionId]);

  const selectedConnection = connections?.find(conn => conn.id === selectedConnectionId);


  const handleSelectionChange = () => {
    // Handle file selection changes if needed
  };

  const handleIntegrationClick = (integrationId: string) => {
    setActiveIntegration(integrationId);
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Show loading state
  if (connectionsLoading) {
    return (
      <div className="h-screen flex">
        <div className="w-60 bg-gray-50 border-r p-4">
          <Skeleton className="h-6 w-24 mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-4 w-32" />
            <p className="text-sm text-gray-600">Loading connections...</p>
          </div>
        </div>
      </div>
    );
  }



  // Show connection error
  if (connectionsError) {
    return (
      <div className="h-screen flex">
        <IntegrationSidebar 
          onIntegrationClick={handleIntegrationClick}
          activeIntegration={activeIntegration}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md mx-auto space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load connections: {connectionsError?.message || 'Unknown error'}
              </AlertDescription>
            </Alert>
            <details className="text-xs text-gray-500">
              <summary>Debug Info</summary>
              <pre>{JSON.stringify(connectionsError, null, 2)}</pre>
            </details>
          </div>
        </div>
      </div>
    );
  }

  // Show no connections
  if (!connections || connections.length === 0) {
    return (
      <div className="h-screen flex">
        <IntegrationSidebar 
          onIntegrationClick={handleIntegrationClick}
          activeIntegration={activeIntegration}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md mx-auto">
            <Alert>
              <AlertDescription>
                No Google Drive connections are available. Please set up a connection first.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  // Show message for non-Google Drive integrations
  if (activeIntegration !== 'googledrive') {
    return (
      <div className="h-screen flex bg-white">
        <IntegrationSidebar 
          googleDriveFileCount={rootFilesData?.data?.length || 0}
          onIntegrationClick={handleIntegrationClick}
          activeIntegration={activeIntegration}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md mx-auto space-y-4">
            <Alert>
              <AlertDescription>
                Sorry, no files found in this section. Try the Google Drive section that has files to navigate and explore.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    );
  }

  // Main render with proper error handling
  return (
    <div className="h-screen flex bg-white">
      {/* Left Sidebar - Collapsible */}
      <IntegrationSidebar 
        googleDriveFileCount={rootFilesData?.data?.length || 0}
        onIntegrationClick={handleIntegrationClick}
        activeIntegration={activeIntegration}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConnection && selectedConnectionId ? (
          <FilePicker
            connectionId={selectedConnectionId}
            onSelectionChange={handleSelectionChange}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <p className="text-gray-500">Setting up connection...</p>
              <details className="text-xs text-gray-500">
                <summary>Debug Info</summary>
                <pre>{JSON.stringify({ 
                  selectedConnectionId, 
                  selectedConnection: selectedConnection?.id,
                  connectionsLength: connections?.length 
                }, null, 2)}</pre>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
