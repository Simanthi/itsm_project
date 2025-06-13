// itsm_frontend/src/context/UIContext/UIContextProvider.tsx
import React, { useState, useCallback, useMemo, type ReactNode } from 'react';
import { Snackbar, Alert, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import { UIContext, type UIContextType } from './UIContext';

interface UIContextProviderProps {
  children: ReactNode;
}

export const UIContextProvider: React.FC<UIContextProviderProps> = ({ children }) => {
  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('info');

  // Confirm Dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogTitle, setConfirmDialogTitle] = useState('');
  const [confirmDialogMessage, setConfirmDialogMessage] = useState('');
  const [confirmDialogOnConfirm, setConfirmDialogOnConfirm] = useState<() => void>(() => () => {});
  const [confirmDialogOnCancel, setConfirmDialogOnCancel] = useState<(() => void) | undefined>(undefined);

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  const showConfirmDialog = useCallback((title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
    setConfirmDialogTitle(title);
    setConfirmDialogMessage(message);
    setConfirmDialogOnConfirm(() => onConfirm); // Store the function directly
    setConfirmDialogOnCancel(() => onCancel); // Store the function directly
    setConfirmDialogOpen(true);
  }, []);

  const hideConfirmDialog = useCallback(() => {
    setConfirmDialogOpen(false);
    setConfirmDialogTitle('');
    setConfirmDialogMessage('');
    setConfirmDialogOnConfirm(() => () => {}); // Reset to no-op
    setConfirmDialogOnCancel(undefined); // Reset
  }, []);

  const handleConfirm = useCallback(() => {
    confirmDialogOnConfirm(); // Execute the stored confirm action
    hideConfirmDialog(); // Close the dialog
  }, [confirmDialogOnConfirm, hideConfirmDialog]);

  const handleCancel = useCallback(() => {
    if (confirmDialogOnCancel) {
      confirmDialogOnCancel(); // Execute the stored cancel action
    }
    hideConfirmDialog(); // Close the dialog
  }, [confirmDialogOnCancel, hideConfirmDialog]);


  const memoizedValue: UIContextType = useMemo(() => ({
    showSnackbar,
    showConfirmDialog,
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    hideSnackbar,
    confirmDialogOpen,
    confirmDialogTitle,
    confirmDialogMessage,
    confirmDialogOnConfirm: handleConfirm, // Expose the internal handler
    confirmDialogOnCancel: handleCancel, // Expose the internal handler
    hideConfirmDialog,
  }), [
    showSnackbar,
    showConfirmDialog,
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    hideSnackbar,
    confirmDialogOpen,
    confirmDialogTitle,
    confirmDialogMessage,
    handleConfirm,
    handleCancel,
    hideConfirmDialog
  ]);

  return (
    <UIContext.Provider value={memoizedValue}>
      {children}
      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={hideSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={hideSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <Dialog
        open={confirmDialogOpen}
        onClose={hideConfirmDialog} // Allows closing by clicking outside or Esc key
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title">{confirmDialogTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-dialog-description">
            {confirmDialogMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color="secondary">
            Cancel
          </Button>
          <Button onClick={handleConfirm} color="primary" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </UIContext.Provider>
  );
};
