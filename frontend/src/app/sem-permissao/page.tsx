'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

export default function ForbiddenPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const handleGoBack = () => {
    if (session?.user?.role === 'PATIENT') {
      router.push('/meu-agendamento');
    } else if (session) {
      router.push('/agenda');
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-4 text-center">
      <div className="w-20 h-20 bg-rose-500/10 text-rose-600 rounded-full flex items-center justify-center border border-rose-500/20 mb-6">
        <ShieldAlert size={40} />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight mb-2">Acesso Negado</h1>
      <p className="text-muted-foreground text-sm max-w-md mb-8">
        Você não possui permissão para acessar esta página. Verifique se você está logado com a conta correta.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleGoBack}
          className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors text-sm"
        >
          <ArrowLeft size={16} /> Voltar para o início
        </button>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="px-6 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl border border-rose-200 flex items-center justify-center gap-2 transition-colors text-sm"
        >
          <LogOut size={16} /> Entrar com outra conta
        </button>
      </div>
    </div>
  );
}
