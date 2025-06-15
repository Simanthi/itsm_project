// itsm_frontend/src/context/UIContext/UIContext.ts
import { createContext } from 'react';

export interface UIContextType {
  showSnackbar: (
    message: string,
    severity?: 'success' | 'error' | 'warning' | 'info',
  ) => void;
  showConfirmDialog: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
  ) => void;
  // State for snackbar
  snackbarOpen: boolean;
  snackbarMessage: string;
  snackbarSeverity: 'success' | 'error' | 'warning' | 'info';
  hideSnackbar: () => void;
  // State for confirm dialog
  confirmDialogOpen: boolean;
  confirmDialogTitle: string;
  confirmDialogMessage: string;
  confirmDialogOnConfirm: () => void;
  confirmDialogOnCancel: (() => void) | undefined;
  hideConfirmDialog: () => void;
}

export const UIContext = createContext<UIContextType | undefined>(undefined);
