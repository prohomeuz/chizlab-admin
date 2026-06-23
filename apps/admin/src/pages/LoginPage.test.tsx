import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// ---------------------------------------------------------------------------
// axios mock — must be at module top-level so Vitest hoists it correctly
// ---------------------------------------------------------------------------
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      isAxiosError: (e: unknown) =>
        e instanceof Error &&
        (e as Error & { isAxiosError?: boolean }).isAxiosError === true,
    },
    isAxiosError: (e: unknown) =>
      e instanceof Error &&
      (e as Error & { isAxiosError?: boolean }).isAxiosError === true,
  };
});

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the component
// ---------------------------------------------------------------------------

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

// ---------------------------------------------------------------------------
// Import component after mocks are set up
// ---------------------------------------------------------------------------
import { LoginPage } from './LoginPage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders 8 PIN input boxes', () => {
    renderLoginPage();
    // The inputs are type="password"; query via aria-label (1-raqam … 8-raqam)
    const pinInputs = Array.from({ length: 8 }, (_, i) =>
      screen.getByLabelText(`${i + 1}-raqam`),
    );
    expect(pinInputs).toHaveLength(8);
  });

  it('submit button is disabled until all 8 digits are entered', () => {
    renderLoginPage();
    const btn = screen.getByRole('button', { name: /kirish/i });
    // Initially incomplete — button should be disabled (opacity/pointer-events set)
    expect(btn).toBeDisabled();
  });

  it('calls login mutation when 8 digits are entered and submit fires', async () => {
    mockLogin.mockResolvedValue({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 900 });
    renderLoginPage();

    const user = userEvent.setup();

    // Type one digit into each box
    for (let i = 1; i <= 8; i++) {
      const input = screen.getByLabelText(`${i}-raqam`);
      await user.type(input, String(i % 10));
    }

    const btn = screen.getByRole('button', { name: /kirish/i });
    await user.click(btn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });
  });

  it('shows an error message when the API returns 401', async () => {
    const axiosError = Object.assign(new Error('Unauthorized'), {
      isAxiosError: true,
      response: { status: 401, data: { message: 'Invalid PIN' } },
    });
    mockLogin.mockRejectedValue(axiosError);
    renderLoginPage();

    const user = userEvent.setup();
    for (let i = 1; i <= 8; i++) {
      const input = screen.getByLabelText(`${i}-raqam`);
      await user.type(input, String(i % 10));
    }

    const btn = screen.getByRole('button', { name: /kirish/i });
    await user.click(btn);

    await waitFor(() => {
      // Error message in Uzbek is shown on failed auth
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });
  });

  it('navigates to /materials after successful login', async () => {
    mockLogin.mockResolvedValue({ accessToken: 'tok', refreshToken: 'ref', expiresIn: 900 });
    renderLoginPage();

    const user = userEvent.setup();
    for (let i = 1; i <= 8; i++) {
      const input = screen.getByLabelText(`${i}-raqam`);
      await user.type(input, String(i % 10));
    }

    await user.click(screen.getByRole('button', { name: /kirish/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/materials', { replace: true });
    });
  });
});
