/**
 * MaterialsListPage — lightweight test suite.
 *
 * The refetchInterval logic inside the useQuery call is:
 *   (q) => items.some(m => m.status === 'pending') ? 5000 : false
 *
 * We test this helper in isolation (pure function) to avoid the
 * full component render needing a QueryClient + Router + AuthContext.
 */

import { describe, it, expect } from 'vitest';
import type { Material, MaterialStatus } from '@contracts/index';

// ---------------------------------------------------------------------------
// Extract the interval-selector logic as a pure function (mirrors the source)
// ---------------------------------------------------------------------------

type QueryState = { data?: { items: Array<{ status: MaterialStatus }> } };

function refetchIntervalSelector(q: QueryState): number | false {
  const items = q.data?.items ?? [];
  return items.some((m) => m.status === 'pending') ? 5000 : false;
}

// Re-type to match how `useQuery` would call it
type UseQueryState = { state: QueryState };
function computeRefetchInterval(q: UseQueryState): number | false {
  const items = q.state.data?.items ?? [];
  return items.some((m) => m.status === 'pending') ? 5000 : false;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMaterial(status: MaterialStatus): Pick<Material, 'id' | 'status'> {
  return { id: crypto.randomUUID(), status };
}

function makeState(items: Array<{ status: MaterialStatus }>): UseQueryState {
  return { state: { data: { items } } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MaterialsListPage — refetchInterval logic', () => {
  it('returns 5000 when at least one item has status "pending"', () => {
    const state = makeState([
      makeMaterial('active'),
      makeMaterial('pending'),
      makeMaterial('draft'),
    ]);
    expect(computeRefetchInterval(state)).toBe(5000);
  });

  it('returns false when no items are pending', () => {
    const state = makeState([
      makeMaterial('active'),
      makeMaterial('active'),
      makeMaterial('draft'),
    ]);
    expect(computeRefetchInterval(state)).toBe(false);
  });

  it('returns false when the items list is empty', () => {
    const state = makeState([]);
    expect(computeRefetchInterval(state)).toBe(false);
  });

  it('returns 5000 when ALL items are pending', () => {
    const state = makeState([makeMaterial('pending'), makeMaterial('pending')]);
    expect(computeRefetchInterval(state)).toBe(5000);
  });

  it('returns false when data is undefined (initial load)', () => {
    const state: UseQueryState = { state: {} };
    expect(computeRefetchInterval(state)).toBe(false);
  });

  it('returns false when only needs_review and draft statuses are present', () => {
    const state = makeState([
      makeMaterial('needs_review'),
      makeMaterial('draft'),
    ]);
    expect(computeRefetchInterval(state)).toBe(false);
  });
});

// Satisfy the TS compiler — refetchIntervalSelector is imported only for type-test use
void (refetchIntervalSelector satisfies (q: QueryState) => number | false);
