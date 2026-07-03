'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { Calendar as CalendarIcon, Clock, User, X, Check, FileText, Ban, ChevronLeft, ChevronRight } from 'lucide-react';

import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// Dynamically import FullCalendar to avoid SSR issues
const FullCalendarComponent = dynamic(() => import('@fullcalendar/react'), { ssr: false }) as any;

interface UserType {
  id: string;
  name: string;
  email: string;
}

interface Professional {
  id: string;
  specialty: string;
  user: UserType;
}

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED';
  notes?: string;
  cancelReason?: string;
  patient: UserType;
  professional: Professional;
}

export default function AgendaPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const calendarRef = React.useRef<any>(null);

  // State
  const [selectedProfId, setSelectedProfId] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentView, setCurrentView] = useState('timeGridWeek');

  const handlePrev = () => {
    calendarRef.current?.getApi().prev();
  };
  const handleNext = () => {
    calendarRef.current?.getApi().next();
  };
  const handleToday = () => {
    calendarRef.current?.getApi().today();
  };
  const handleChangeView = (view: string) => {
    calendarRef.current?.getApi().changeView(view);
    setCurrentView(view);
  };

  const handleDatesSet = (dateInfo: any) => {
    setCurrentTitle(dateInfo.view.title);
    setCurrentView(dateInfo.view.type);
  };

  // Fetch professionals
  const { data: professionals = [] } = useQuery<Professional[]>({
    queryKey: ['professionals'],
    queryFn: async () => {
      const res = await api.get('/professionals');
      return res.data;
    },
  });

  // Automatically select professional if logged in user is professional
  useEffect(() => {
    if (session?.user?.role === 'PROFESSIONAL' && professionals.length > 0) {
      const prof = professionals.find((p) => p.user.id === session.user.id);
      if (prof) {
        setSelectedProfId(prof.id);
      }
    } else if (professionals.length > 0 && !selectedProfId) {
      setSelectedProfId(professionals[0].id);
    }
  }, [session, professionals, selectedProfId]);

  // Fetch appointments for selected professional
  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['appointments', selectedProfId],
    queryFn: async () => {
      if (!selectedProfId) return [];
      const res = await api.get(`/scheduling/appointments?professionalId=${selectedProfId}`);
      return res.data;
    },
    enabled: !!selectedProfId,
  });

  // Confirm mutation
  const confirmMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/scheduling/appointments/${id}/confirm`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', selectedProfId] });
      setShowModal(false);
      setSelectedAppointment(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Erro ao confirmar consulta');
    },
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.patch(`/scheduling/appointments/${id}/cancel`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', selectedProfId] });
      setIsCancelling(false);
      setCancelReason('');
      setShowModal(false);
      setSelectedAppointment(null);
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Erro ao cancelar consulta');
    },
  });

  // Map appointments to FullCalendar events
  const calendarEvents = appointments.map((appt) => {
    let color = '#009057'; // Scheduled -> Green (primary)
    if (appt.status === 'CONFIRMED') color = '#0ea5e9'; // Confirmed -> Sky blue
    if (appt.status === 'CANCELLED') color = '#f43f5e'; // Cancelled -> Rose

    return {
      id: appt.id,
      title: appt.patient.name,
      start: appt.startsAt,
      end: appt.endsAt,
      backgroundColor: color,
      borderColor: color,
      textColor: '#ffffff',
      extendedProps: appt,
    };
  });

  const handleEventClick = (info: any) => {
    const appt = info.event.extendedProps as Appointment;
    setSelectedAppointment(appt);
    setErrorMsg('');
    setCancelReason('');
    setIsCancelling(false);
    setShowModal(true);
  };

  const isProfessionalUser = session?.user?.role === 'PROFESSIONAL';

  return (
    <div className="space-y-6 text-foreground">
      {/* Professional Selector */}
      {!isProfessionalUser && professionals.length > 0 && (
        <div className="p-5 bg-card border border-border rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-muted-foreground">Selecionar Médico:</span>
            <select
              className="px-4 py-2 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={selectedProfId}
              onChange={(e) => setSelectedProfId(e.target.value)}
            >
              {professionals.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.user.name} ({prof.specialty})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Calendar Area */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 bg-card border border-border p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-2 hover:bg-muted rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handleNext}
            className="p-2 hover:bg-muted rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={handleToday}
            className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-full transition-colors border border-primary/20 cursor-pointer"
          >
            Hoje
          </button>
        </div>

        <h3 className="text-lg font-extrabold text-foreground capitalize">
          {currentTitle}
        </h3>

        <div className="flex gap-1 bg-muted p-1 rounded-xl border border-border/10">
          <button
            onClick={() => handleChangeView('dayGridMonth')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              currentView === 'dayGridMonth'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Mês
          </button>
          <button
            onClick={() => handleChangeView('timeGridWeek')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              currentView === 'timeGridWeek'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => handleChangeView('timeGridDay')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              currentView === 'timeGridDay'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Dia
          </button>
        </div>
      </div>

      <div className="p-6 bg-card border border-border rounded-2xl shadow-sm">
        <FullCalendarComponent
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={false}
          locale="pt-br"
          slotMinTime="08:00:00"
          slotMaxTime="18:00:00"
          allDaySlot={false}
          events={calendarEvents}
          eventClick={handleEventClick}
          height="auto"
          datesSet={handleDatesSet}
          buttonText={{
            today: 'Hoje',
            day: 'Dia',
            week: 'Semana',
            month: 'Mês',
          }}
        />
      </div>

      {/* Appointment Detail Modal */}
      {showModal && selectedAppointment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 relative shadow-2xl">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-foreground rounded-lg hover:bg-muted"
            >
              <X size={18} />
            </button>

            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <CalendarIcon size={20} className="text-primary" /> Detalhes da Consulta
            </h3>

            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-600 text-sm">
                {errorMsg}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div className="flex gap-3">
                <User size={18} className="text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">Paciente</p>
                  <p className="text-sm font-semibold text-foreground">{selectedAppointment.patient.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedAppointment.patient.email}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Clock size={18} className="text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">Data e Horário</p>
                  <p className="text-sm font-semibold text-foreground">
                    {new Date(selectedAppointment.startsAt).toLocaleString('pt-BR')} até{' '}
                    {new Date(selectedAppointment.endsAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              {selectedAppointment.notes && (
                <div className="flex gap-3">
                  <FileText size={18} className="text-muted-foreground mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground">Observações</p>
                    <p className="text-sm text-slate-650">{selectedAppointment.notes}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Status:</span>
                <span
                  className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    selectedAppointment.status === 'CONFIRMED'
                      ? 'bg-sky-500/10 text-sky-600 border border-sky-500/20'
                      : selectedAppointment.status === 'CANCELLED'
                      ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                      : 'bg-primary/10 text-primary border border-primary/20'
                  }`}
                >
                  {selectedAppointment.status === 'CONFIRMED'
                    ? 'Confirmada'
                    : selectedAppointment.status === 'CANCELLED'
                    ? 'Cancelada'
                    : 'Agendada'}
                </span>
              </div>

              {selectedAppointment.status === 'CANCELLED' && selectedAppointment.cancelReason && (
                <div className="p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-rose-700 text-xs">
                  <strong>Motivo do cancelamento:</strong> {selectedAppointment.cancelReason}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            {selectedAppointment.status === 'SCHEDULED' && (
              <div className="flex flex-col gap-3">
                {!isCancelling ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => confirmMutation.mutate(selectedAppointment.id)}
                      className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Check size={18} /> Confirmar Consulta
                    </button>
                    <button
                      onClick={() => setIsCancelling(true)}
                      className="flex-1 py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl border border-rose-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Ban size={18} /> Cancelar Consulta
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div>
                      <label className="block text-xs font-semibold text-slate-650 mb-2">
                        Motivo do Cancelamento
                      </label>
                      <textarea
                        required
                        className="w-full px-3 py-2 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm h-20"
                        placeholder="Escreva o motivo aqui..."
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (!cancelReason) return;
                          cancelMutation.mutate({ id: selectedAppointment.id, reason: cancelReason });
                        }}
                        className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-sm"
                      >
                        Confirmar Cancelamento
                      </button>
                      <button
                        onClick={() => setIsCancelling(false)}
                        className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm border border-slate-200"
                      >
                        Voltar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
