import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge } from './StatusBadge';
import type { MaterialStatus } from '@contracts/index';

describe('StatusBadge', () => {
  const cases: Array<{ status: MaterialStatus; expectedLabel: string; expectedBg: string }> = [
    { status: 'active', expectedLabel: 'Faol', expectedBg: '#e6f4ed' },
    { status: 'pending', expectedLabel: 'Kutilmoqda', expectedBg: '#fef3e2' },
    { status: 'draft', expectedLabel: 'Qoralama', expectedBg: '#edf2f7' },
    { status: 'needs_review', expectedLabel: "Ko'rib chiqish kerak", expectedBg: '#fff5f5' },
  ];

  it.each(cases)(
    'renders correct label "$expectedLabel" for status "$status"',
    ({ status, expectedLabel }) => {
      render(<StatusBadge status={status} />);
      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    },
  );

  it.each(cases)(
    'applies correct background color for status "$status"',
    ({ status, expectedBg }) => {
      render(<StatusBadge status={status} />);
      const badge = screen.getByRole('status');
      expect(badge).toHaveStyle({ backgroundColor: expectedBg });
    },
  );

  it('renders with role="status" for accessibility', () => {
    render(<StatusBadge status="active" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('sets aria-label containing the Uzbek status label', () => {
    render(<StatusBadge status="pending" />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-label', expect.stringContaining('Kutilmoqda'));
  });
});
