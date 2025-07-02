// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from './NotFoundPage'; // Assuming path based on current step

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderNotFoundPage = () => {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>
  );
};

describe('NotFoundPage.tsx', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders the 404 error code', () => {
    renderNotFoundPage();
    expect(screen.getByRole('heading', { name: /404/i, level: 1 })).toBeInTheDocument();
  });

  it('renders the "Page Not Found" heading', () => {
    renderNotFoundPage();
    expect(screen.getByRole('heading', { name: /Page Not Found/i, level: 2 })).toBeInTheDocument();
  });

  it('renders the descriptive message', () => {
    renderNotFoundPage();
    expect(screen.getByText(/The page you're looking for doesn't exist or has been moved./i)).toBeInTheDocument();
  });

  it('renders the "Go to Home" button', () => {
    renderNotFoundPage();
    expect(screen.getByRole('button', { name: /Go to Home/i })).toBeInTheDocument();
  });

  it('navigates to home when "Go to Home" button is clicked', async () => {
    renderNotFoundPage();
    const user = userEvent.setup();
    const homeButton = screen.getByRole('button', { name: /Go to Home/i });

    await user.click(homeButton);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
