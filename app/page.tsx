'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { 
  Package, 
  FileText, 
  Users, 
  UserCog, 
  History, 
  ClipboardList, 
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useEffect } from 'react';

const navItems = [
  {
    title: 'Products',
    description: 'Manage inventory, prices, and POS availability',
    icon: Package,
    href: '/products',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    title: 'Invoices & Orders',
    description: 'Track sales, view invoices and POS orders',
    icon: FileText,
    href: '/invoices',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    title: 'Customers',
    description: 'Manage customer profiles and history',
    icon: Users,
    href: '/customers',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    title: 'Cashiers',
    description: 'Manage cashier accounts and permissions',
    icon: UserCog,
    href: '/cashiers',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    title: 'Session Closures',
    description: 'Review and validate POS session reports',
    icon: History,
    href: '/closures',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
  },
  {
    title: 'Audit Logs',
    description: 'Track system activity and security events',
    icon: ClipboardList,
    href: '/logs',
    color: 'text-slate-600',
    bg: 'bg-slate-50',
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <LayoutDashboard className="h-6 w-6" />
            <span>GSM Manager</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold">{user?.name || 'Administrator'}</span>
              <span className="text-xs text-muted-foreground">{user?.company_name || 'Main Office'}</span>
            </div>
            <div className="h-8 w-px bg-border mx-2" />
            <button 
              onClick={logout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage your store operations and track performance from one place.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {navItems.map((item) => (
            <button
              key={item.title}
              onClick={() => router.push(item.href)}
              className="group relative flex flex-col items-start rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/20"
            >
              <div className={`rounded-xl ${item.bg} p-3 mb-4 transition-transform group-hover:scale-110`}>
                <item.icon className={`h-6 w-6 ${item.color}`} />
              </div>
              
              <h3 className="text-lg font-bold text-foreground mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground text-left mb-6">
                {item.description}
              </p>
              
              <div className="mt-auto flex items-center text-sm font-semibold text-primary">
                Open module
                <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-12 rounded-2xl border bg-gradient-to-r from-primary/5 to-transparent p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Odoo Integration</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                All data is synchronized in real-time with your Odoo backend. Changes made here will be reflected in your main database immediately.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Connection: {process.env.NEXT_PUBLIC_ODOO_URL || 'Configured'}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
