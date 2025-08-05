# Optimistic UI Implementation Guide

This document outlines the optimistic UI implementation in the file management application, which provides immediate feedback to users while operations are being processed in the background. The implementation follows the golden rule: **The Frontend Should Never Wait for Long Backend Jobs**.

## Overview

The application now uses optimistic updates to make the UI feel snappy and responsive. When users perform actions like adding or removing files from the knowledge base, the UI updates immediately while the actual API calls happen in the background.

### Key Principles

1. **Asynchronous Backend Operations**: The backend API responds immediately after queuing jobs, never waiting for long-running processes
2. **Optimistic Frontend Updates**: The UI updates instantly based on expected outcomes
3. **Background Data Synchronization**: Data is refetched in the background to ensure eventual consistency
4. **Subtle Loading States**: Background operations show subtle indicators without blocking the UI

## Key Components

### 1. Optimistic De-indexing Hook (`use-deindex-resource.ts`)

The de-indexing hook was already well-implemented with optimistic updates. Here's how it works:

```typescript
export function useDeindexResource() {
  const queryClient = useQueryClient();
  const knowledgeBaseQueryKey = QUERY_KEYS.knowledgeBase(KNOWLEDGE_BASE_ID);

  const mutation = useMutation({
    mutationFn: deindexResource,
    
    // Step 1: Optimistically update the UI before the API call
    onMutate: async (resourceIdToRemove: string) => {
      await queryClient.cancelQueries({ queryKey: knowledgeBaseQueryKey });
      const previousKnowledgeBase = queryClient.getQueryData<KnowledgeBase>(knowledgeBaseQueryKey);
      
      if (previousKnowledgeBase) {
        queryClient.setQueryData<KnowledgeBase>(knowledgeBaseQueryKey, {
          ...previousKnowledgeBase,
          connection_source_ids: previousKnowledgeBase.connection_source_ids.filter(
            (id) => id !== resourceIdToRemove
          ),
        });
      }
      
      return { previousKnowledgeBase };
    },

    // Step 2: Handle errors by rolling back the optimistic update
    onError: (err, variables, context) => {
      if (context?.previousKnowledgeBase) {
        queryClient.setQueryData(knowledgeBaseQueryKey, context.previousKnowledgeBase);
      }
      toast.error(`Failed to remove file: ${err.message}`);
    },

    // Step 3: Refetch data after the mutation to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseQueryKey });
      queryClient.invalidateQueries({ queryKey: ['indexed-resources'] });
    },
  });

  return mutation;
}
```

### 2. Asynchronous Backend API (`/api/knowledge-base/add-resources/route.ts`)

The backend API has been refactored to respond immediately without waiting for indexing completion:

```typescript
export async function POST(request: Request) {
  try {
    const { resource_ids } = await request.json();
    const authHeaders = await getStackAiApiAuthHeaders();

    // 1. Update the knowledge base with new resource IDs
    const currentKB = await fetchKnowledgeBase();
    const updatedKB = {
      ...currentKB,
      connection_source_ids: [...currentKB.connection_source_ids, ...resource_ids],
    };
    await updateKnowledgeBase(updatedKB);

    // 2. Trigger the sync job (but don't wait for it)
    await triggerSync();

    // 3. Respond immediately! Do not wait for sync completion
    return NextResponse.json({ 
      message: 'Resources have been queued for indexing.',
      status: 'in_progress'
    });

  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
```

**Key Changes:**
- Removed `waitForSyncCompletion` function that was blocking the response
- API now responds in milliseconds instead of 10-15 seconds
- Backend handles indexing asynchronously in the background

### 3. Optimistic Resource Indexing Hook (`use-batch-knowledge-base.ts`)

The batch knowledge base hook has been refactored to use optimistic updates:

```typescript
export function useBatchKnowledgeBase(onSettled?: () => void) {
  const queryClient = useQueryClient();
  const knowledgeBaseQueryKey = QUERY_KEYS.knowledgeBase(KNOWLEDGE_BASE_ID);

  return useMutation({
    mutationFn: addResourcesToKnowledgeBaseAPI,

    onMutate: async (resource_ids: string[]) => {
      await queryClient.cancelQueries({ queryKey: knowledgeBaseQueryKey });
      const previousKnowledgeBase = queryClient.getQueryData<KnowledgeBase>(knowledgeBaseQueryKey);

      if (previousKnowledgeBase) {
        queryClient.setQueryData<KnowledgeBase>(knowledgeBaseQueryKey, {
          ...previousKnowledgeBase,
          connection_source_ids: [...previousKnowledgeBase.connection_source_ids, ...resource_ids],
        });
      }

      toast.loading('Adding files to knowledge base...');
      return { previousKnowledgeBase };
    },

    onError: (err, variables, context) => {
      if (context?.previousKnowledgeBase) {
        queryClient.setQueryData(knowledgeBaseQueryKey, context.previousKnowledgeBase);
      }
      toast.dismiss();
      toast.error(`Failed to add files: ${err.message}`);
    },

    onSuccess: () => {
      toast.dismiss();
      toast.success('Files added successfully and are now indexing!');
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: knowledgeBaseQueryKey });
      queryClient.invalidateQueries({ queryKey: ['indexed-resources'] });
      onSettled?.();
    },
  });
}
```

### 3. Pending Resources State Management

The FilePicker component now tracks pending resources to show appropriate loading states:

```typescript
const [pendingResources, setPendingResources] = useState<Set<string>>(new Set());

// Add to pending when starting operations
const handleDeindex = useCallback(async (resource: Resource) => {
  setPendingResources(prev => new Set(prev).add(resource.resource_id));
  
  try {
    await deindexResource(resource.resource_id);
  } finally {
    setPendingResources(prev => {
      const newSet = new Set(prev);
      newSet.delete(resource.resource_id);
      return newSet;
    });
  }
}, [deindexResource]);

const handleAddResources = useCallback(async () => {
  const filesToIndex = getSelectedFiles().filter(file => file.inode_type === 'file');
  const resourceIds = filesToIndex.map(file => file.resource_id);
  
  setPendingResources(prev => new Set([...prev, ...resourceIds]));
  addResources(resourceIds);
  clearSelection();
  setSelectedIds(new Set());
}, [getSelectedFiles, addResources, clearSelection]);
```

### 4. Decoupled Loading States (`isLoading` vs `isFetching`)

The application now properly differentiates between initial loading and background refetches:

```typescript
// In FilePicker.tsx
const { data: filesData, isLoading, isFetching, error } = useConnectionFiles({
  connectionId,
  resourceId: currentResourceId,
});

// Pass different loading states to components
<FileList
  files={files}
  isLoading={isLoading}        // For initial skeleton screen
  isFetching={isFetching}      // For subtle background refresh indicator
  // ... other props
/>
```

**Key Benefits:**
- `isLoading`: Shows full skeleton only on initial load (no data available)
- `isFetching`: Shows subtle opacity change during background refetches (stale data remains visible)
- Users can continue interacting with the UI during background operations

### 5. Enhanced Status Calculation with Operation Tracking

The file indexing status now includes pending states with proper operation tracking:

```typescript
// Track pending operations with their type
const [pendingResources, setPendingResources] = useState<Map<string, 'adding' | 'removing'>>(new Map());

const fileIndexingStatus = useMemo(() => {
  const indexedIds = new Set(knowledgeBase?.connection_source_ids || []);
  const statusMap = new Map<string, IndexingStatus>();
  
  files.forEach(file => {
    if (file.inode_type === 'file') {
      let status: IndexingStatus;
      
      // Check if the resource is pending (being added or removed)
      const pendingOperation = pendingResources.get(file.resource_id);
      if (pendingOperation) {
        // Use the tracked operation type instead of guessing
        status = pendingOperation === 'adding' ? 'indexing' : 'unindexing';
      } else {
        // Normal status based on whether it's in the knowledge base
        status = indexedIds.has(file.resource_id) ? 'indexed' : 'not-indexed';
      }
      
      statusMap.set(file.resource_id, status);
    }
  });
  
  return statusMap;
}, [files, knowledgeBase, pendingResources]);
```

**Key Improvement:**
- Uses `Map<string, 'adding' | 'removing'>` to track operation types
- Eliminates incorrect status determination based on optimistic updates
- Ensures "Adding to KB..." shows when adding files, not "Removing..."

## Visual Feedback

### Status Badges

The `SimpleIndexingBadge` component shows different states:

- **Not Indexed**: Gray outline badge
- **Indexing**: Yellow badge with spinning loader
- **Indexed**: Blue badge with checkmark
- **Unindexing**: Orange badge with spinning loader

### Loading States

- **Initial Load**: Full skeleton screen when no data is available
- **Background Refetches**: Subtle opacity change with spinner icon in header
- **Pending Operations**: Files show "indexing" or "unindexing" badges
- **Footer Button**: Shows loading state during batch operations
- **Toast Notifications**: Provide feedback on operation status

## Best Practices Implemented

1. **Always Provide Rollback**: Both hooks store previous state and restore it on error
2. **Clear Visual Feedback**: Pending states are clearly indicated with badges and loading indicators
3. **Toast Notifications**: Users are informed about operation status and errors
4. **Eventual Consistency**: Data is refetched after operations to ensure consistency
5. **Simple User Experience**: Users don't need to think about what's happening behind the scenes

## Benefits

- **Immediate Feedback**: Users see changes instantly
- **Better UX**: No waiting for API responses to see results
- **Error Handling**: Graceful rollback on failures
- **Consistency**: Eventual consistency ensures data accuracy
- **Performance**: UI feels much more responsive
- **No Blocking**: API responds in milliseconds instead of 10-15 seconds
- **Background Processing**: Long-running jobs don't block the UI
- **Continuous Interaction**: Users can continue working during background operations

## Testing the Implementation

To test the optimistic UI:

1. **Add Files**: Select files and click "Add to Knowledge Base" - badges should immediately show "Adding to KB..." and API should respond in milliseconds
2. **Remove Files**: Click the trash icon on indexed files - badges should immediately show "Removing..."
3. **Background Refetches**: During background operations, the UI should show subtle loading indicators without blocking interaction
4. **Error Scenarios**: Network errors should trigger rollbacks and error toasts
5. **Success Scenarios**: Operations should show success toasts and update to final states

## Performance Improvements

### Before (Blocking):
- API calls took 10-15 seconds to complete
- UI was completely blocked during operations
- Users had to wait for entire indexing process
- Full page refresh on every operation

### After (Asynchronous):
- API responds in milliseconds
- UI remains interactive during background operations
- Optimistic updates provide instant feedback
- Subtle loading states for background operations
- No blocking or full page refreshes

The implementation follows React Query's optimistic update patterns and provides a smooth, responsive user experience that meets the "snappy and fast" requirement. 