'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Calendar, Clock, User, FileText, Ban } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED';
  notes?: string;
  cancelReason?: string;
  professional: {
    specialty: string;
    user: {
      name: string;
    };
  };
}

export default function PatientAppointmentsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');
  const [isCancellingLoading, setIsCancellingLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Fetch patient appointments
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['meus-agendamentos'],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const res = await axios.get(`${API_URL}/scheduling/users/${session.user.id}/appointments`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });
      return res.data;
    },
    enabled: !!session?.user?.id,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 0,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-foreground">
      <div className="flex justify-between items-center bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold">Meus Agendamentos</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Histórico completo e consultas futuras</p>
        </div>
        <div className="text-sm text-muted-foreground">
          Total: <strong className="text-foreground font-semibold">{appointments.length}</strong>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-12">Carregando consultas...</p>
      ) : appointments.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <Calendar size={48} className="text-muted-foreground mx-auto" />
          <h3 className="text-lg font-bold">Nenhuma consulta agendada</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Você não possui agendamentos no momento. Clique abaixo para marcar uma consulta!
          </p>
          <a
            href="/meu-agendamento"
            className="inline-block py-2.5 px-6 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl text-sm transition-colors shadow-md"
          >
            Agendar Primeira Consulta
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((appt) => {
            const timeStr = new Date(appt.startsAt).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Sao_Paulo',
            });
            const endTimeStr = new Date(appt.endsAt).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Sao_Paulo',
            });
            const dateStr = new Date(appt.startsAt).toLocaleDateString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
            });

            return (
              <div
                key={appt.id}
                className="bg-card border border-border rounded-3xl p-6 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Calendar size={12} className="text-primary" /> {dateStr}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        appt.status === 'CONFIRMED'
                          ? 'bg-sky-500/10 text-sky-600 border border-sky-500/20'
                          : appt.status === 'CANCELLED'
                          ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          : 'bg-primary/10 text-primary border border-primary/20'
                      }`}
                    >
                      {appt.status === 'CONFIRMED'
                        ? 'Confirmada'
                        : appt.status === 'CANCELLED'
                        ? 'Cancelada'
                        : 'Agendada'}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <User size={18} className="text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Médico(a)</p>
                      <h4 className="text-sm font-semibold text-foreground">{appt.professional.user.name}</h4>
                      <p className="text-xs text-primary font-semibold">{appt.professional.specialty}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock size={18} className="text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Horário</p>
                      <p className="text-sm font-semibold text-foreground">
                        {timeStr} - {endTimeStr}
                      </p>
                    </div>
                  </div>

                  {appt.notes && (
                    <div className="flex items-start gap-3 pt-3 border-t border-border/40">
                      <FileText size={16} className="text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Sintomas / Observações</p>
                        <p className="text-xs text-slate-650 mt-0.5">{appt.notes}</p>
                      </div>
                    </div>
                  )}

                  {appt.status === 'CANCELLED' && appt.cancelReason && (
                    <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
                      <Ban size={14} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Motivo do Cancelamento:</strong>
                        <p className="mt-0.5">{appt.cancelReason}</p>
                      </div>
                    </div>
                  )}

                  {appt.status !== 'CANCELLED' && (
                    <div className="pt-4 mt-2 border-t border-border/40">
                      {cancellingId === appt.id ? (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-rose-600">Deseja realmente cancelar esta consulta?</p>
                          <div>
                            <label className="block text-[10px] text-muted-foreground font-medium mb-1">Motivo do cancelamento (opcional)</label>
                            <input
                              type="text"
                              value={cancelReasonInput}
                              onChange={(e) => setCancelReasonInput(e.target.value)}
                              placeholder="Ex: Imprevisto de trabalho"
                              className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                              disabled={isCancellingLoading}
                            />
                          </div>
                          {cancelError && <p className="text-[10px] text-rose-500">{cancelError}</p>}
                          <div className="flex justify-end gap-2 text-xs">
                            <button
                              onClick={() => setCancellingId(null)}
                              className="px-3 py-1.5 border border-border text-muted-foreground rounded-xl hover:bg-muted font-medium transition-colors"
                              disabled={isCancellingLoading}
                            >
                              Voltar
                            </button>
                            <button
                              onClick={async () => {
                                setIsCancellingLoading(true);
                                setCancelError(null);
                                try {
                                  await axios.patch(
                                    `${API_URL}/scheduling/appointments/${appt.id}/cancel`,
                                    { reason: cancelReasonInput || 'Cancelado pelo paciente' },
                                    {
                                      headers: {
                                        Authorization: `Bearer ${session?.accessToken}`,
                                      },
                                    }
                                  );
                                  await queryClient.invalidateQueries({ queryKey: ['meus-agendamentos'] });
                                  setCancellingId(null);
                                } catch (err: any) {
                                  console.error(err);
                                  setCancelError(err.response?.data?.message || 'Erro ao cancelar consulta');
                                } finally {
                                  setIsCancellingLoading(false);
                                }
                              }}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1"
                              disabled={isCancellingLoading}
                            >
                              {isCancellingLoading ? 'Cancelando...' : 'Confirmar'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              setCancellingId(appt.id);
                              setCancelReasonInput('');
                              setCancelError(null);
                            }}
                            className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
                          >
                            <Ban size={14} />
                            Cancelar Consulta
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
