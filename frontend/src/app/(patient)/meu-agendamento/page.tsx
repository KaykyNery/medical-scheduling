'use client';

import React, { useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, User, CheckCircle, ArrowRight, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Professional {
  id: string;
  specialty: string;
  registrationId: string;
  user: {
    name: string;
    email: string;
  };
}

interface Slot {
  startsAt: string;
  endsAt: string;
  available: boolean;
}

function PatientBookingForm() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const showWelcome = searchParams.get('welcome') === 'true';
  const welcomeName = searchParams.get('name') || '';
  const [closedWelcome, setClosedWelcome] = useState(false);

  // Step state
  const [step, setStep] = useState(1); // 1: Specialty, 2: Professional, 3: Date/Slots, 4: Confirm, 5: Success
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState('');

  // Booking error/loading
  const [bookingError, setBookingError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // Queries
  const { data: specialties = [] } = useQuery<string[]>({
    queryKey: ['specialties'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/professionals/specialties`);
      return res.data;
    },
  });

  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ['professionals'],
    queryFn: async () => {
      const res = await axios.get(`${API_URL}/professionals?onlyActive=true`);
      return res.data;
    },
  });

  const { data: slots = [], isFetching: slotsFetching } = useQuery<Slot[]>({
    queryKey: ['slots', selectedProfessional?.id, selectedDate],
    queryFn: async () => {
      if (!selectedProfessional?.id || !selectedDate) return [];
      const res = await axios.get(
        `${API_URL}/scheduling/available-slots?professionalId=${selectedProfessional.id}&date=${selectedDate}`
      );
      return res.data;
    },
    enabled: !!selectedProfessional?.id && !!selectedDate,
  });

  const filteredProfessionals = selectedSpecialty
    ? professionals.filter((p) => p.specialty === selectedSpecialty)
    : professionals;

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError('');
    setBookingLoading(true);

    try {
      if (!selectedSlot || !session?.accessToken) return;

      await axios.post(
        `${API_URL}/scheduling/appointments`,
        {
          professionalId: selectedProfessional?.id,
          startsAt: selectedSlot.startsAt,
          notes: notes || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );

      await queryClient.invalidateQueries({ queryKey: ['meus-agendamentos'] });
      setStep(5); // Success
    } catch (err: any) {
      console.error(err);
      setBookingError(
        err.response?.data?.message ||
          err.message ||
          'Erro ao realizar agendamento. Verifique se o horário ainda está disponível.'
      );
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {showWelcome && !closedWelcome && (
        <div className="p-4 bg-primary/10 border border-primary/20 text-primary rounded-2xl flex justify-between items-center shadow-sm">
          <span className="text-sm font-semibold">
            Seja bem-vindo, {welcomeName}! Sua conta foi criada com sucesso.
          </span>
          <button onClick={() => setClosedWelcome(true)} className="p-1 hover:bg-primary/20 rounded text-xs font-bold transition-colors">
            Fechar
          </button>
        </div>
      )}
      {/* Step indicator */}
      <div className="flex justify-between items-center mb-6 max-w-2xl mx-auto px-4">
        {[1, 2, 3, 4].map((s) => (
          <React.Fragment key={s}>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                step === s
                  ? 'bg-primary text-white ring-4 ring-primary/20'
                  : step > s
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-border text-muted-foreground'
              }`}
            >
              {step > s ? '✓' : s}
            </div>
            {s < 4 && (
              <div
                className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${
                  step > s ? 'bg-emerald-600' : 'bg-border'
                }`}
              ></div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-card border border-border shadow-xl rounded-3xl p-8">
        {/* STEP 1: Specialty Selection */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-foreground">Qual especialidade você procura?</h2>
            {specialties.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">Nenhuma especialidade disponível no momento.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {specialties.map((spec) => (
                  <button
                    key={spec}
                    onClick={() => {
                      setSelectedSpecialty(spec);
                      setStep(2);
                    }}
                    className="p-6 bg-card hover:bg-primary/5 border border-border hover:border-primary/50 rounded-2xl text-left transition-all duration-300 hover:shadow-md"
                  >
                    <h3 className="font-bold text-lg text-foreground mb-1">{spec}</h3>
                    <p className="text-primary text-xs font-semibold flex items-center gap-1">
                      Ver profissionais <ArrowRight size={12} />
                    </p>
                  </button>
                ))}
                <button
                  onClick={() => {
                    setSelectedSpecialty('');
                    setStep(2);
                  }}
                  className="p-6 bg-card hover:bg-primary/5 border border-border hover:border-primary/50 rounded-2xl text-left transition-all duration-300"
                >
                  <h3 className="font-bold text-lg text-foreground mb-1">Ver Todas</h3>
                  <p className="text-primary text-xs font-semibold flex items-center gap-1">
                    Listar todos os profissionais <ArrowRight size={12} />
                  </p>
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Professional Selection */}
        {step === 2 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">Escolha o Profissional</h2>
              <button
                onClick={() => setStep(1)}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <ChevronLeft size={14} /> Voltar para Especialidades
              </button>
            </div>

            {filteredProfessionals.length === 0 ? (
              <p className="text-muted-foreground text-center py-10">Nenhum profissional disponível para esta especialidade.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProfessionals.map((prof) => (
                  <button
                    key={prof.id}
                    onClick={() => {
                      setSelectedProfessional(prof);
                      setStep(3);
                    }}
                    className="p-6 bg-card hover:bg-primary/5 border border-border hover:border-primary/50 rounded-2xl text-left transition-all duration-300 flex items-center gap-4 hover:shadow-md"
                  >
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-xl border border-primary/20">
                      {prof.user.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-foreground">{prof.user.name}</h3>
                      <p className="text-sm text-primary font-medium mb-1">{prof.specialty}</p>
                      <p className="text-xs text-muted-foreground">{prof.registrationId}</p>
                    </div>
                    <ArrowRight size={18} className="text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Date & Slots Selection */}
        {step === 3 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">Escolha Data e Horário</h2>
              <button
                onClick={() => setStep(2)}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <ChevronLeft size={14} /> Voltar para Profissionais
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Professional summary */}
              <div className="p-6 bg-muted/30 rounded-2xl border border-border flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-2xl border border-primary/20 mb-4">
                  {selectedProfessional?.user.name.charAt(0)}
                </div>
                <h3 className="font-bold text-lg text-foreground">{selectedProfessional?.user.name}</h3>
                <p className="text-sm text-primary font-medium">{selectedProfessional?.specialty}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedProfessional?.registrationId}</p>
              </div>

              {/* Date Selection */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Selecione uma Data</label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary transition-colors"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>

                {selectedDate && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-3">Horários Disponíveis</label>
                    {slotsFetching ? (
                      <p className="text-muted-foreground text-sm py-4">Buscando horários...</p>
                    ) : slots.length === 0 ? (
                      <p className="text-muted-foreground text-sm py-4 bg-muted/20 border border-dashed border-border rounded-xl text-center">
                        Nenhum horário disponível para este dia.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {slots.map((slot) => {
                          const timeStr = new Date(slot.startsAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'America/Sao_Paulo',
                          });
                          return (
                            <button
                              key={slot.startsAt}
                              disabled={!slot.available}
                              onClick={() => {
                                setSelectedSlot(slot);
                                setStep(4);
                              }}
                              className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                                slot.available
                                  ? 'bg-card border border-border hover:border-primary text-foreground hover:bg-primary/5'
                                  : 'bg-muted/10 border border-transparent text-slate-400 cursor-not-allowed opacity-50'
                              }`}
                            >
                              {timeStr}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Confirm Booking */}
        {step === 4 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">Confirmar Agendamento</h2>
              <button
                onClick={() => setStep(3)}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <ChevronLeft size={14} /> Voltar para Horários
              </button>
            </div>

            {bookingError && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-600 text-sm">
                {bookingError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Appointment Summary Box */}
              <div className="p-6 bg-muted/40 border border-border rounded-2xl space-y-4">
                <h3 className="font-bold text-foreground border-b border-border pb-2">Detalhes da Consulta</h3>

                <div className="flex items-start gap-3">
                  <User size={18} className="text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Profissional</p>
                    <p className="text-sm font-semibold text-foreground">{selectedProfessional?.user.name}</p>
                    <p className="text-xs text-primary font-medium">{selectedProfessional?.specialty}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar size={18} className="text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Data</p>
                    <p className="text-sm font-semibold text-foreground">
                      {new Date(selectedDate + 'T00:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock size={18} className="text-primary mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Horário</p>
                    <p className="text-sm font-semibold text-foreground">
                      {selectedSlot &&
                        new Date(selectedSlot.startsAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'America/Sao_Paulo',
                        })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Form column */}
              <div className="md:col-span-2">
                <form onSubmit={handleBookingSubmit} className="space-y-6">
                  {session && (
                    <div className="p-6 bg-muted/30 border border-border rounded-2xl">
                      <p className="text-sm text-muted-foreground mb-2">Agendando como paciente</p>
                      <h4 className="font-bold text-lg text-foreground">{session.user.name}</h4>
                      <p className="text-sm text-slate-600">{session.user.email}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">Observações / Sintomas (Opcional)</label>
                    <textarea
                      className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/45 focus:border-primary transition-colors h-24"
                      placeholder="Relate brevemente o motivo da consulta se desejar"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={bookingLoading}
                    className="w-full py-3 px-4 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-md disabled:opacity-50"
                  >
                    {bookingLoading ? 'Processando Agendamento...' : 'Confirmar e Reservar Horário'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Success screen */}
        {step === 5 && (
          <div className="text-center py-12 max-w-lg mx-auto space-y-6">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center border border-primary/20 mx-auto animate-bounce">
              <CheckCircle size={40} />
            </div>
            <h2 className="text-3xl font-extrabold text-foreground">Consulta Agendada!</h2>
            <p className="text-muted-foreground">
              Seu agendamento foi realizado com sucesso. Você receberá notificações e lembretes por e-mail e SMS antes da consulta.
            </p>
            <div className="pt-6 flex justify-center gap-4">
              <button
                onClick={() => {
                  setSelectedSpecialty('');
                  setSelectedProfessional(null);
                  setSelectedDate('');
                  setSelectedSlot(null);
                  setNotes('');
                  setStep(1);
                }}
                className="px-6 py-2.5 border border-border bg-card hover:bg-muted text-foreground font-semibold rounded-xl transition-colors shadow-sm"
              >
                Agendar Outra Consulta
              </button>
              <button
                onClick={() => {
                  router.push('/meus-agendamentos');
                }}
                className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl transition-colors shadow-lg"
              >
                Ver Meus Agendamentos
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatientNewBookingPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-center py-12">Carregando formulário...</p>}>
      <PatientBookingForm />
    </Suspense>
  );
}
