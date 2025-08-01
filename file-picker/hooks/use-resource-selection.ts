import { useState, useCallback } from 'react';
import { Resource } from '@/lib/types';

interface UseResourceSelectionReturn {
  selectedResources: Resource[];
  selectedResourceIds: Set<string>;
  toggleResourceSelection: (resource: Resource) => void;
  clearSelection: () => void;
  isSelected: (resourceId: string) => boolean;
  getSelectedFiles: () => Resource[];
  selectMultiple: (resources: Resource[]) => void;
}

export function useResourceSelection(): UseResourceSelectionReturn {
  const [selectedResources, setSelectedResources] = useState<Resource[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(new Set());

  const toggleResourceSelection = useCallback((resource: Resource) => {
    setSelectedResources(prev => {
      const isCurrentlySelected = prev.some(r => r.resource_id === resource.resource_id);
      
      if (isCurrentlySelected) {
        // Remove from selection
        return prev.filter(r => r.resource_id !== resource.resource_id);
      } else {
        // Add to selection
        return [...prev, resource];
      }
    });

    setSelectedResourceIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resource.resource_id)) {
        newSet.delete(resource.resource_id);
      } else {
        newSet.add(resource.resource_id);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedResources([]);
    setSelectedResourceIds(new Set());
  }, []);

  const isSelected = useCallback((resourceId: string) => {
    return selectedResourceIds.has(resourceId);
  }, [selectedResourceIds]);

  const getSelectedFiles = useCallback(() => {
    return selectedResources.filter(resource => resource.inode_type === 'file');
  }, [selectedResources]);

  const selectMultiple = useCallback((resources: Resource[]) => {
    setSelectedResources(resources);
    setSelectedResourceIds(new Set(resources.map(r => r.resource_id)));
  }, []);

  return {
    selectedResources,
    selectedResourceIds,
    toggleResourceSelection,
    clearSelection,
    isSelected,
    getSelectedFiles,
    selectMultiple,
  };
}