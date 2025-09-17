import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Full-width layout without sidebar */}
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}