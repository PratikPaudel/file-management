import { toast as sonnerToast } from "sonner"

export const toast = {
  success: (message: string) => {
    sonnerToast.success(message, { duration: 5000 });
  },
  
  loading: (message: string) => {
    return sonnerToast.loading(message);
  },
  
  error: (message: string) => {
    sonnerToast.error(message, { duration: 5000 });
  },
  
  dismiss: () => {
    sonnerToast.dismiss();
  }
};

// Toast messages for the workflow
export const TOAST_MESSAGES = {
  ADDING_TO_KB: 'Adding files to knowledge base...',
  ADDED_TO_KB: 'Files added to knowledge base successfully!',
  SYNCING: 'Syncing knowledge base...',
  SYNCED: 'Knowledge base synced! Files are now searchable.',
  ERROR_ADDING: 'Failed to add files to knowledge base',
  ERROR_SYNCING: 'Failed to sync knowledge base',
} as const;