import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useUserProfile } from './useUserProfile';

const { getUserMock, fromMock } = vi.hoisted(() => {
  const getUserMock = vi.fn().mockResolvedValue({ data: { user: { id: '123' } } });
  const singleMock = vi.fn().mockResolvedValue({
    data: {
      id: '123',
      client_id: '1',
      admin_role: 'user',
      can_switch_clients: false,
      active_client_id: null,
      clients: { nom: 'Client A' },
      active_client: null
    },
    error: null
  });
  const eqMock = vi.fn().mockReturnValue({ single: singleMock });
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
  const fromMock = vi.fn().mockReturnValue({ select: selectMock });
  return { getUserMock, fromMock };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: getUserMock },
    from: fromMock
  }
}));

describe('useUserProfile', () => {
  it('fetches and returns user profile', async () => {
    const { result } = renderHook(() => useUserProfile());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    expect(result.current.profile).toEqual({
      id: '123',
      client_id: '1',
      client_name: 'Client A',
      admin_role: 'user',
      can_switch_clients: false,
      active_client_id: null,
      active_client_name: undefined
    });
    expect(result.current.loading).toBe(false);
    expect(getUserMock).toHaveBeenCalled();
    expect(fromMock).toHaveBeenCalledWith('profiles');
  });
});
