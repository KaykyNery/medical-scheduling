'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { Calendar, CheckCircle2, XCircle, Users, TrendingUp } from 'lucide-react';

interface UserType {
  id: string;
}

interface Appointment {
  id: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED';
  startsAt: string;
  patient: UserType;
}

export default function RelatoriosPage() {
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments-reports'],
    queryFn: async () => {
      const res = await api.get('/scheduling/appointments');
      return res.data;
    },
  });

  // Calculate statistics
  const totalBookings = appointments.length;
  const confirmed = appointments.filter((a) => a.status === 'CONFIRMED').length;
  const scheduled = appointments.filter((a) => a.status === 'SCHEDULED').length;
  const cancelled = appointments.filter((a) => a.status === 'CANCELLED').length;

  const cancelRate = totalBookings > 0 ? ((cancelled / totalBookings) * 100).toFixed(1) : '0';
  const confirmationRate = totalBookings > 0 ? (((confirmed + scheduled) / totalBookings) * 100).toFixed(1) : '0';

  const uniquePatients = new Set(appointments.map((a) => a.patient?.id).filter(Boolean));

  const stats = [
    {
      name: 'Total de Agendamentos',
      value: totalBookings,
      icon: Calendar,
      color: 'text-primary bg-primary/10 border-primary/20',
      gradient: 'from-primary/10 to-primary/5',
    },
    {
      name: 'Confirmados',
      value: confirmed + scheduled,
      icon: CheckCircle2,
      color: 'text-sky-600 bg-sky-500/10 border-sky-500/20',
      gradient: 'from-sky-600/10 to-sky-600/5',
    },
    {
      name: 'Cancelamentos',
      value: `${cancelled} (${cancelRate}%)`,
      icon: XCircle,
      color: 'text-rose-600 bg-rose-500/10 border-rose-500/20',
      gradient: 'from-rose-600/10 to-rose-600/5',
    },
    {
      name: 'Pacientes Ativos',
      value: uniquePatients.size,
      icon: Users,
      color: 'text-purple-600 bg-purple-500/10 border-purple-500/20',
      gradient: 'from-purple-600/10 to-purple-600/5',
    },
  ];

  return (
    <div className="space-y-8 text-foreground">
      {isLoading ? (
        <p className="text-muted-foreground text-center py-12">Carregando relatório...</p>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.name}
                  className={`p-6 rounded-2xl bg-card border border-border shadow-sm hover:border-slate-300 transition-all`}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{stat.name}</p>
                      <p className="text-3xl font-extrabold text-foreground">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-xl border ${stat.color}`}>
                      <Icon size={20} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Donut Chart and Indicators */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Status Breakdown SVG Chart */}
            <div className="p-6 bg-card border border-border rounded-3xl space-y-6 shadow-sm">
              <div>
                <h3 className="font-bold text-lg text-foreground">Distribuição de Status</h3>
                <p className="text-xs text-muted-foreground mt-1">Visão geral do percentual de agendamentos</p>
              </div>

              {totalBookings === 0 ? (
                <p className="text-muted-foreground text-center py-12">Sem dados de agendamentos no momento.</p>
              ) : (
                <div className="flex flex-col md:flex-row items-center gap-8 py-4">
                  {/* Custom Donut Chart using SVG */}
                  <div className="relative w-40 h-40 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#e0e6e3"
                        strokeWidth="12"
                      />
                      {/* Confirmed portion */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#0ea5e9"
                        strokeWidth="12"
                        strokeDasharray={`${(confirmed / totalBookings) * 251.2} 251.2`}
                      />
                      {/* Scheduled portion */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#009057"
                        strokeWidth="12"
                        strokeDasharray={`${(scheduled / totalBookings) * 251.2} 251.2`}
                        strokeDashoffset={`-${(confirmed / totalBookings) * 251.2}`}
                      />
                      {/* Cancelled portion */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#f43f5e"
                        strokeWidth="12"
                        strokeDasharray={`${(cancelled / totalBookings) * 251.2} 251.2`}
                        strokeDashoffset={`-${((confirmed + scheduled) / totalBookings) * 251.2}`}
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-extrabold text-foreground">{totalBookings}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-sky-500 rounded-full"></span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-350">Confirmadas</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {confirmed} ({totalBookings > 0 ? ((confirmed / totalBookings) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-primary rounded-full"></span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-350">Agendadas</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {scheduled} ({totalBookings > 0 ? ((scheduled / totalBookings) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-rose-500 rounded-full"></span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-350">Canceladas</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {cancelled} ({totalBookings > 0 ? ((cancelled / totalBookings) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Performance Indicators */}
            <div className="p-6 bg-card border border-border rounded-3xl space-y-6 shadow-sm">
              <div>
                <h3 className="font-bold text-lg text-foreground">Indicadores de Desempenho</h3>
                <p className="text-xs text-muted-foreground mt-1">Métricas de conversão e fidelidade</p>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground font-medium">Agendados</span>
                    <span className="text-foreground font-semibold">{confirmationRate}%</span>
                  </div>
                  <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full"
                      style={{ width: `${confirmationRate}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground font-medium">Cancelados</span>
                    <span className="text-foreground font-semibold">{cancelRate}%</span>
                  </div>
                  <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full"
                      style={{ width: `${cancelRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
