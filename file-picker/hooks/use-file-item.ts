import { useMemo } from 'react';
import { Folder, FileText } from 'lucide-react';
import { Resource } from '@/lib/types';

export function useFileItem(resource: Resource) {
  const isFolder = resource.inode_type === 'directory';
  const fileName = useMemo(
    () => resource.inode_path.path.split('/').pop() || 'Untitled',
    [resource.inode_path.path]
  );

  const iconConfig = useMemo(() => {
    if (isFolder) {
      return { Icon: Folder, className: "w-full h-full text-gray-900" };
    }
    // PDF files get a red icon
    if (fileName.endsWith('.pdf')) {
      return { Icon: FileText, className: "w-full h-full text-red-500" };
    }
    return { Icon: FileText, className: "w-full h-full text-gray-500" };
  }, [isFolder, fileName]);

  return {
    isFolder,
    fileName,
    icon: iconConfig,
  };
} 