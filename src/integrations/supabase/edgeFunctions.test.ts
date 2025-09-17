import { createClient } from '@supabase/supabase-js';
import { describe, it, expect, vi } from 'vitest';

describe('supabase edge functions', () => {
  it('invokes update-user-permissions function', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.url;
      expect(url).toContain('/functions/v1/update-user-permissions');
      expect(init?.method).toBe('POST');
      const body = JSON.parse(String(init?.body));
      expect(body).toEqual({ userId: '1', adminRole: 'user', canSwitchClients: false });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const client = createClient('https://example.supabase.co', 'public-anon-key', {
      global: { fetch: fetchMock },
    });

    const { data, error } = await client.functions.invoke('update-user-permissions', {
      body: { userId: '1', adminRole: 'user', canSwitchClients: false },
    });

    expect(error).toBeNull();
    expect(data).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalled();
  });
});
