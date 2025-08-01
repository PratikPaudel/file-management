import { useState, useCallback } from 'react';

export type FileStatus = 'not_indexed' | 'indexed' | 'synced';

interface UseFileStatusReturn {
  fileStatuses: Map<string, FileStatus>;
  setFileStatus: (resourceId: string, status: FileStatus) => void;
  setMultipleFileStatuses: (resourceIds: string[], status: FileStatus) => void;
  getFileStatus: (resourceId: string) => FileStatus;
  clearAllStatuses: () => void;
}

export function useFileStatus(): UseFileStatusReturn {
  const [fileStatuses, setFileStatuses] = useState<Map<string, FileStatus>>(new Map());

  const setFileStatus = useCallback((resourceId: string, status: FileStatus) => {
    setFileStatuses(prev => {
      const newMap = new Map(prev);
      newMap.set(resourceId, status);
      return newMap;
    });
  }, []);

  const setMultipleFileStatuses = useCallback((resourceIds: string[], status: FileStatus) => {
    setFileStatuses(prev => {
      const newMap = new Map(prev);
      resourceIds.forEach(id => {
        newMap.set(id, status);
      });
      return newMap;
    });
  }, []);

  const getFileStatus = useCallback((resourceId: string): FileStatus => {
    return fileStatuses.get(resourceId) || 'not_indexed';
  }, [fileStatuses]);

  const clearAllStatuses = useCallback(() => {
    setFileStatuses(new Map());
  }, []);

  return {
    fileStatuses,
    setFileStatus,
    setMultipleFileStatuses,
    getFileStatus,
    clearAllStatuses,
  };
}