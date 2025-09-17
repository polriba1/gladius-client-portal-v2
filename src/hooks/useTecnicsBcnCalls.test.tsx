import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useTecnicsBcnCalls } from './useTecnicsBcnCalls';

const { fromMock, channelMock, removeChannelMock } = vi.hoisted(() => {
  const rangeMock = vi.fn().mockResolvedValue({ data: null, error: new Error('Fetch failed') });
  const orderMock = vi.fn().mockReturnValue({ range: rangeMock });
  const lteMock = vi.fn().mockReturnValue({ order: orderMock });
  const gteMock = vi.fn().mockReturnValue({ lte: lteMock });
  const selectMock = vi.fn().mockReturnValue({ gte: gteMock });
  const fromMock = vi.fn().mockReturnValue({ select: selectMock });

  const subscribeMock = vi.fn().mockReturnValue({});
  const onMock = vi.fn().mockImplementation(() => ({ on: onMock, subscribe: subscribeMock }));
  const channelMock = vi.fn().mockImplementation(() => ({ on: onMock, subscribe: subscribeMock }));
  const removeChannelMock = vi.fn();

  return { fromMock, channelMock, removeChannelMock };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: fromMock,
    channel: channelMock,
    removeChannel: removeChannelMock,
  },
}));

describe('useTecnicsBcnCalls', () => {
  it('sets error state when fetchAll fails', async () => {
    const dateRange = { from: new Date('2024-01-01'), to: new Date('2024-01-02') };
    const { result } = renderHook(() => useTecnicsBcnCalls(dateRange));

    await waitFor(() => expect(result.current.error).toBe('Fetch failed'));
    expect(result.current.loading).toBe(false);
  });
});
