// itsm_frontend/src/context/UIContext/UIContextProvider.test.tsx
import React from 'react';
import { render, screen, act, waitFor, within } from '@testing-library/react'; // Added waitFor and within
import userEvent from '@testing-library/user-event';

import { UIContextProvider } from './UIContextProvider';
import { useUI } from './useUI';

// Helper component to consume and display/trigger context values
const TestUIConsumer: React.FC = () => {
  const {
    showSnackbar,
    showConfirmDialog,
    snackbarOpen, // For direct assertion if needed, though typically assert by visibility
    snackbarMessage,
    snackbarSeverity,
    confirmDialogOpen,
    confirmDialogTitle,
    confirmDialogMessage,
  } = useUI();

  return (
    <div>
      <button onClick={() => showSnackbar('Test Snackbar Message', 'success')}>Show Success Snackbar</button>
      <button onClick={() => showSnackbar('Test Error Message', 'error')}>Show Error Snackbar</button>
      <button
        onClick={() =>
          showConfirmDialog(
            'Test Confirm Title',
            'Test Confirm Message',
            vi.fn(() => screen.getByTestId('confirm-result').textContent = 'confirmed'),
            vi.fn(() => screen.getByTestId('confirm-result').textContent = 'cancelled')
          )
        }
      >
        Show Confirm Dialog
      </button>
      <div data-testid="snackbar-message">{snackbarOpen && snackbarMessage}</div>
      <div data-testid="snackbar-severity">{snackbarOpen && snackbarSeverity}</div>
      <div data-testid="confirm-dialog-title">{confirmDialogOpen && confirmDialogTitle}</div>
      <div data-testid="confirm-dialog-message">{confirmDialogOpen && confirmDialogMessage}</div>
      <div data-testid="confirm-result"></div>
    </div>
  );
};


describe('UIContextProvider and useUI', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    // Any general mocks if needed, e.g., for timers if testing autoHide
  });

  it('useUI throws error when used outside of UIContextProvider', () => {
    const originalError = console.error;
    console.error = vi.fn(); // Suppress expected console error from React
    expect(() => render(<TestUIConsumer />)).toThrow(
      'useUI must be used within a UIContextProvider',
    );
    console.error = originalError;
  });

  describe('Snackbar Functionality', () => {
    it('initial state: snackbar is not visible', () => {
      render(
        <UIContextProvider>
          <TestUIConsumer />
        </UIContextProvider>,
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(); // MUI Snackbar Alert has role="alert"
      expect(screen.getByTestId('snackbar-message')).toBeEmptyDOMElement();
    });

    it('showSnackbar displays snackbar with correct message and severity, then hides it', async () => {
      render(
        <UIContextProvider>
          <TestUIConsumer />
        </UIContextProvider>,
      );

      await user.click(screen.getByRole('button', { name: /Show Success Snackbar/i }));

      const alert = await screen.findByRole('alert');
      expect(alert).toBeVisible();
      expect(alert).toHaveTextContent('Test Snackbar Message');
      // MUI Alert severity is often reflected in a class like MuiAlert-filledSuccess or data attribute
      // For simplicity, we can check the internal state via our test consumer if direct DOM check is too complex
      expect(screen.getByTestId('snackbar-severity')).toHaveTextContent('success');

      // Simulate closing the snackbar (e.g., by clicking its close button if it had one, or waiting for autoHide)
      // The Snackbar in UIContextProvider has an onClose on the Alert component itself.
      // Let's find the close button if MUI renders one by default within Alert.
      // MUI's Alert with an onClose prop renders a button with role="button" and aria-label="Close"
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('Confirm Dialog Functionality', () => {
    it('initial state: confirm dialog is not visible', () => {
      render(
        <UIContextProvider>
          <TestUIConsumer />
        </UIContextProvider>,
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByTestId('confirm-dialog-title')).toBeEmptyDOMElement();
    });

    it('showConfirmDialog displays dialog with correct title and message', async () => {
      render(
        <UIContextProvider>
          <TestUIConsumer />
        </UIContextProvider>,
      );

      await user.click(screen.getByRole('button', { name: /Show Confirm Dialog/i }));

      const dialog = await screen.findByRole('dialog');
      expect(dialog).toBeVisible();
      // Use role 'heading' with name to target the actual DialogTitle component's rendering
      expect(screen.getByRole('heading', { name: 'Test Confirm Title' })).toBeInTheDocument();
      // Use within to scope the search for the message to within the dialog
      expect(within(dialog).getByText('Test Confirm Message')).toBeInTheDocument();
    });

    it('calls onConfirm and closes dialog when "Confirm" is clicked', async () => {
      // The onConfirm mock is set up inside TestUIConsumer to update confirm-result
      render(
        <UIContextProvider>
          <TestUIConsumer />
        </UIContextProvider>,
      );

      await user.click(screen.getByRole('button', { name: /Show Confirm Dialog/i }));
      await screen.findByRole('dialog'); // Ensure dialog is open

      // MUI Dialog typically has buttons with text "Confirm" and "Cancel"
      await user.click(screen.getByRole('button', { name: 'Confirm' }));

      expect(screen.getByTestId('confirm-result')).toHaveTextContent('confirmed');
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('calls onCancel and closes dialog when "Cancel" is clicked', async () => {
      // The onCancel mock is set up inside TestUIConsumer
      render(
        <UIContextProvider>
          <TestUIConsumer />
        </UIContextProvider>,
      );

      await user.click(screen.getByRole('button', { name: /Show Confirm Dialog/i }));
      await screen.findByRole('dialog');

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.getByTestId('confirm-result')).toHaveTextContent('cancelled');
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });
});
