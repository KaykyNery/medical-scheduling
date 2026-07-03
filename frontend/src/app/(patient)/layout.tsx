'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, CalendarPlus, LogOut, Menu } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  const menuItems = [
    { name: 'Agendar Consulta', href: '/meu-agendamento', icon: CalendarPlus },
    { name: 'Meus Agendamentos', href: '/meus-agendamentos', icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside
        className={`bg-card border-r border-border transition-all duration-300 flex flex-col z-30 ${sidebarOpen ? 'w-64' : 'w-20'
          }`}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-border gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-white shadow-md">
            CD
          </div>
          {sidebarOpen && (
            <span className="font-bold text-lg text-primary">
              Portal do Paciente
            </span>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-6 px-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${isActive
                  ? 'bg-primary text-primary-foreground font-semibold shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / User section */}
        <div className="p-4 border-t border-border">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-4 px-4 py-3 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all"
          >
            <LogOut size={20} />
            {sidebarOpen && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <Menu size={20} />
            </button>
            <h2 className="font-bold text-lg text-foreground">
              {menuItems.find((i) => i.href === pathname)?.name || 'Portal'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold text-foreground">{session?.user?.name}</span>
              <span className="text-xs text-muted-foreground">Paciente</span>
            </div>
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold border border-primary/20">
              {session?.user?.name?.charAt(0)}
            </div>
          </div>
        </header>

        {/* Page children container */}
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
    </div>
  );
}
