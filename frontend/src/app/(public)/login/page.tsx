'use client';

import React, { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError('Credenciais inválidas. Verifique seu e-mail e senha.');
      } else {
        const session = await getSession();
        const role = session?.user?.role;

        const searchParams = new URLSearchParams(window.location.search);
        const callbackUrl = searchParams.get('callbackUrl');

        if (callbackUrl) {
          router.push(callbackUrl);
        } else if (role === 'PATIENT') {
          router.push('/meu-agendamento');
        } else {
          router.push('/agenda');
        }
        router.refresh();
      }
    } catch (err) {
      setError('Erro ao realizar login. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-background text-foreground px-4 relative overflow-hidden">
      {/* Background blobs for soft clinical light gradient */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/30 rounded-full filter blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md p-8 rounded-3xl bg-card border border-border/80 shadow-xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center font-bold text-white shadow-md mx-auto mb-4">
            CD
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Clínica Diamantina
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">Acesse o portal de agendamentos e gestão</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary transition-colors"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary transition-colors"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-md hover:shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Carregando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-border pt-6">
          <p className="text-muted-foreground text-base">
            Não tem conta?{' '}
            <Link href="/registro" className="text-primary hover:underline font-semibold">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
