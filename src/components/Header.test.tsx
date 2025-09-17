import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Header from './Header';

const { signOutMock, navigateMock, toastMock } = vi.hoisted(() => ({
  signOutMock: vi.fn().mockResolvedValue({ error: null }),
  navigateMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { auth: { signOut: signOutMock } }
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
vi.mock('@/components/LanguageSwitcher', () => ({ LanguageSwitcher: () => <div /> }));

describe('Header', () => {
  it('signs out and navigates home', async () => {
    const { getByRole } = render(<Header />);
    fireEvent.click(getByRole('button', { name: /header.logout/i }));

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(navigateMock).toHaveBeenCalledWith('/');
    expect(toastMock).toHaveBeenCalledWith({ title: 'common.success', description: 'auth.logout' });
  });
});
