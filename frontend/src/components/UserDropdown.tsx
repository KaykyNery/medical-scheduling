'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, ChevronDown } from 'lucide-react';

export function UserDropdown() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const user = session?.user;
  const userName = user?.name || 'Usuário';
  const userEmail = user?.email || '';
  const userRole = user?.role || 'PATIENT';

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    PROFESSIONAL: 'Médico(a)',
    RECEPTIONIST: 'Recepcionista',
    PATIENT: 'Paciente',
  };

  const roleLabel = roleLabels[userRole] || userRole;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-3 p-1.5 pl-3 rounded-2xl hover:bg-muted/70 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 group"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Menu do usuário"
      >
        <div className="flex flex-col text-right">
          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
            {userName}
          </span>
          <span className="text-xs text-muted-foreground capitalize">
            {roleLabel}
          </span>
        </div>

        <div className="relative">
          <div className="w-10 h-10 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white rounded-full flex items-center justify-center font-bold border border-primary/20 transition-all shadow-sm">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-card border border-border rounded-full flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors shadow-xs">
            <ChevronDown size={10} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-card border border-border rounded-2xl shadow-xl z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3.5 py-3 border-b border-border/60 mb-1">
            <p className="text-sm font-bold text-foreground truncate">{userName}</p>
            {userEmail && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{userEmail}</p>
            )}
            <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {roleLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            <span>Sair da conta</span>
          </button>
        </div>
      )}
    </div>
  );
}
