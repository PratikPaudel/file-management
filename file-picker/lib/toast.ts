
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
  ADDING_TO_KB: 'Adding selected files to the knowledge base...',
  ADDED_TO_KB_SUCCESS: 'Files successfully added and are now being indexed.',
  ERROR_ADDING: 'Failed to add files to the knowledge base.',
  ALREADY_INDEXED: 'This file has already been added to the knowledge base.',
  SOME_FILES_SKIPPED: 'Some files were skipped because they have already been added.',
} as const;
