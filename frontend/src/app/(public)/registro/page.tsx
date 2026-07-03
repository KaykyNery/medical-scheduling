'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const registerSchema = z
  .object({
    name: z.string().min(1, 'Nome completo é obrigatório'),
    email: z.string().email('E-mail inválido'),
    phone: z.string().min(1, 'Telefone é obrigatório'),
    password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true);
    setApiError('');

    try {
      // 1. Post to API register endpoint
      await axios.post(`${API_URL}/auth/register`, {
        email: data.email,
        password: data.password,
        name: data.name,
        phone: data.phone,
      });

      // 2. Auto-login after registration
      const loginRes = await signIn('credentials', {
        redirect: false,
        email: data.email,
        password: data.password,
      });

      if (loginRes?.error) {
        setApiError('Cadastro realizado, mas falha no login automático. Faça o login manualmente.');
      } else {
        // Redirect to /meu-agendamento with welcome toast query param
        router.push(`/meu-agendamento?welcome=true&name=${encodeURIComponent(data.name)}`);
        router.refresh();
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 409) {
        setApiError('E-mail já está cadastrado no sistema.');
      } else if (err.response?.status === 429) {
        setApiError('Muitas tentativas de registro. Por favor, aguarde 1 minuto.');
      } else {
        setApiError(err.response?.data?.message || 'Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-background text-foreground px-4 relative overflow-hidden py-12">
      {/* Soft clinical gradients */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full filter blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-secondary/30 rounded-full filter blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-lg p-8 rounded-3xl bg-card border border-border/80 shadow-xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center font-bold text-white shadow-md mx-auto mb-4">
            C
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Criar Conta
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Cadastre-se para agendar e gerenciar suas consultas
          </p>
        </div>

        {apiError && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-450 text-sm">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nome Completo
            </label>
            <input
              type="text"
              className={`w-full px-4 py-2.5 bg-card border ${
                errors.name ? 'border-rose-500 focus:ring-rose-500/20' : 'border-border focus:ring-primary/45'
              } rounded-xl text-foreground focus:outline-none focus:ring-2 transition-colors`}
              placeholder="Digite seu nome completo"
              {...register('name')}
            />
            {errors.name && (
              <span className="text-xs text-rose-500 mt-1 block">{errors.name.message}</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                E-mail
              </label>
              <input
                type="email"
                className={`w-full px-4 py-2.5 bg-card border ${
                  errors.email ? 'border-rose-500 focus:ring-rose-500/20' : 'border-border focus:ring-primary/45'
                } rounded-xl text-foreground focus:outline-none focus:ring-2 transition-colors`}
                placeholder="exemplo@exemplo.com"
                {...register('email')}
              />
              {errors.email && (
                <span className="text-xs text-rose-500 mt-1 block">{errors.email.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Telefone / Celular
              </label>
              <input
                type="text"
                className={`w-full px-4 py-2.5 bg-card border ${
                  errors.phone ? 'border-rose-500 focus:ring-rose-500/20' : 'border-border focus:ring-primary/45'
                } rounded-xl text-foreground focus:outline-none focus:ring-2 transition-colors`}
                placeholder="(11) 99999-9999"
                {...register('phone')}
              />
              {errors.phone && (
                <span className="text-xs text-rose-500 mt-1 block">{errors.phone.message}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Senha
              </label>
              <input
                type="password"
                className={`w-full px-4 py-2.5 bg-card border ${
                  errors.password ? 'border-rose-500 focus:ring-rose-500/20' : 'border-border focus:ring-primary/45'
                } rounded-xl text-foreground focus:outline-none focus:ring-2 transition-colors`}
                placeholder="Mínimo 8 caracteres"
                {...register('password')}
              />
              {errors.password && (
                <span className="text-xs text-rose-500 mt-1 block">{errors.password.message}</span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Confirmar Senha
              </label>
              <input
                type="password"
                className={`w-full px-4 py-2.5 bg-card border ${
                  errors.confirmPassword
                    ? 'border-rose-500 focus:ring-rose-500/20'
                    : 'border-border focus:ring-primary/45'
                } rounded-xl text-foreground focus:outline-none focus:ring-2 transition-colors`}
                placeholder="Confirme sua senha"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <span className="text-xs text-rose-500 mt-1 block">{errors.confirmPassword.message}</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-md hover:shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Criando Conta...' : 'Cadastrar-se'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-border pt-6">
          <p className="text-muted-foreground text-sm">
            Já tem conta?{' '}
            <Link href="/login" className="text-primary hover:underline font-semibold">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
