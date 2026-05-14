import { AdminGuard } from '@/components/admin/AdminGuard';
import { AdminNav } from '@/components/admin/AdminNav';

export const metadata = {
  title: 'Admin Panel — VocabJP',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="page-container py-8">
        <div className="flex gap-6 items-start">
          <AdminNav />
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
