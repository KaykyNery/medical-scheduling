'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  X,
  Check,
  FileText,
  Ban,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  CalendarDays,
  Sparkles,
} from 'lucide-react';

import dayGridPlugin from '@fullcalendar/daygrid';
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
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  notes?: string;
  cancelReason?: string;
  patient: UserType;
  professional: Professional;
}

// 18 slots from 08:00 to 17:00 (30-min intervals)
const TIME_SLOTS = [
  { start: '08:00', end: '08:30' },
  { start: '08:30', end: '09:00' },
  { start: '09:00', end: '09:30' },
  { start: '09:30', end: '10:00' },
  { start: '10:00', end: '10:30' },
  { start: '10:30', end: '11:00' },
  { start: '11:00', end: '11:30' },
  { start: '11:30', end: '12:00' },
  { start: '12:00', end: '12:30' },
  { start: '12:30', end: '13:00' },
  { start: '13:00', end: '13:30' },
  { start: '13:30', end: '14:00' },
  { start: '14:00', end: '14:30' },
  { start: '14:30', end: '15:00' },
  { start: '15:00', end: '15:30' },
  { start: '15:30', end: '16:00' },
  { start: '16:00', end: '16:30' },
  { start: '16:30', end: '17:00' },
];

function getTodayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getPreviousDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day - 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getNextDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day + 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatFullDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
  const dayNum = date.getDate();
  const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
  const yearNum = date.getFullYear();

  const capWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const capMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  return `${capWeekday}, ${dayNum} de ${capMonth} de ${yearNum}`;
}

export default function AgendaPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const calendarRef = useRef<any>(null);

  // View state: 'month' (calendário mensal) or 'day' (grade detalhada do dia)
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());

  // Professional & Modal state
  const [selectedProfId, setSelectedProfId] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');

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

  const currentProfessional = professionals.find((p) => p.id === selectedProfId);

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

  // Group appointments by date (YYYY-MM-DD)
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((appt) => {
      const d = new Date(appt.startsAt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateKey = `${y}-${m}-${day}`;
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(appt);
    });
    return map;
  }, [appointments]);

  // Appointments for the currently selected day in daily view
  const dayAppointments = useMemo(() => {
    return appointmentsByDate[selectedDate] || [];
  }, [appointmentsByDate, selectedDate]);

  // Month summary events for FullCalendar
  const monthSummaryEvents = useMemo(() => {
    return Object.entries(appointmentsByDate).map(([dateKey, appts]) => {
      return {
        id: `summary-${dateKey}`,
        start: dateKey,
        allDay: true,
        title: `${appts.length} ${appts.length === 1 ? 'consulta' : 'consultas'}`,
        extendedProps: {
          dateKey,
          appointments: appts,
          total: appts.length,
          scheduled: appts.filter((a) => a.status === 'SCHEDULED').length,
          confirmed: appts.filter((a) => a.status === 'CONFIRMED').length,
          cancelled: appts.filter((a) => a.status === 'CANCELLED').length,
        },
      };
    });
  }, [appointmentsByDate]);

  // Calendar month navigation
  const handlePrevMonth = () => {
    calendarRef.current?.getApi().prev();
  };
  const handleNextMonth = () => {
    calendarRef.current?.getApi().next();
  };
  const handleTodayMonth = () => {
    calendarRef.current?.getApi().today();
  };
  const handleDatesSet = (dateInfo: any) => {
    setCurrentTitle(dateInfo.view.title);
  };

  // Day navigation in daily view
  const handlePrevDay = () => {
    setSelectedDate((prev) => getPreviousDate(prev));
  };
  const handleNextDay = () => {
    setSelectedDate((prev) => getNextDate(prev));
  };
  const handleTodayDay = () => {
    setSelectedDate(getTodayDateStr());
  };

  // Action: click on day in month calendar
  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setViewMode('day');
  };

  const handleReturnToMonth = () => {
    setViewMode('month');
    setTimeout(() => {
      calendarRef.current?.getApi()?.gotoDate(selectedDate);
    }, 50);
  };

  // Month cell custom rendering
  const renderMonthEventContent = (eventInfo: any) => {
    const { appointments: appts, total, scheduled, confirmed, cancelled } =
      eventInfo.event.extendedProps;

    return (
      <div className="w-full mt-0.5 p-1 rounded-lg bg-card/90 border border-primary/20 shadow-2xs hover:border-primary/50 transition-all flex flex-col gap-0.5 cursor-pointer text-left">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-[11px] font-bold text-primary flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            {total} {total === 1 ? 'consulta' : 'consultas'}
          </span>
        </div>

        {/* Status breakdown pills */}
        <div className="flex items-center gap-1 flex-wrap">
          {scheduled > 0 && (
            <span className="text-[8.5px] font-bold px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              {scheduled} agend.
            </span>
          )}
          {confirmed > 0 && (
            <span className="text-[8.5px] font-bold px-1 py-0.2 rounded bg-sky-500/10 text-sky-600 border border-sky-500/20">
              {confirmed} conf.
            </span>
          )}
          {cancelled > 0 && (
            <span className="text-[8.5px] font-bold px-1 py-0.2 rounded bg-rose-500/10 text-rose-600 border border-rose-500/20">
              {cancelled} canc.
            </span>
          )}
        </div>

        {/* Patient preview on large screens */}
        <div className="hidden xl:block space-y-0.5 pt-0.5 border-t border-border/30">
          {appts.slice(0, 1).map((a: Appointment) => {
            const timeStr = new Date(a.startsAt).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <div key={a.id} className="text-[9px] text-muted-foreground truncate flex items-center gap-1">
                <span className="font-semibold text-foreground/90">{timeStr}</span>
                <span className="truncate">{a.patient.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleDayCellClassNames = (arg: any) => {
    const y = arg.date.getFullYear();
    const m = String(arg.date.getMonth() + 1).padStart(2, '0');
    const d = String(arg.date.getDate()).padStart(2, '0');
    const classes = ['cursor-pointer'];
    if (appointmentsByDate[`${y}-${m}-${d}`]?.length > 0) {
      classes.push('has-appointments');
    }
    return classes;
  };

  // Helper for status colors
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return {
          label: 'Confirmada',
          cardBg: 'bg-sky-500/5 hover:bg-sky-500/10 border-sky-500/30',
          badge: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30',
          borderLeft: 'border-l-4 border-l-sky-500',
        };
      case 'CANCELLED':
        return {
          label: 'Cancelada',
          cardBg: 'bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/30',
          badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30',
          borderLeft: 'border-l-4 border-l-rose-500',
        };
      case 'COMPLETED':
        return {
          label: 'Concluída',
          cardBg: 'bg-slate-500/5 hover:bg-slate-500/10 border-slate-500/30',
          badge: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/30',
          borderLeft: 'border-l-4 border-l-slate-500',
        };
      case 'NO_SHOW':
        return {
          label: 'Não compareceu',
          cardBg: 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/30',
          badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30',
          borderLeft: 'border-l-4 border-l-amber-500',
        };
      case 'SCHEDULED':
      default:
        return {
          label: 'Agendada',
          cardBg: 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/30',
          badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
          borderLeft: 'border-l-4 border-l-emerald-500',
        };
    }
  };

  // Filter appointments for a specific 30-min slot
  const getAppointmentsForSlot = (slot: { start: string; end: string }) => {
    const [sH, sM] = slot.start.split(':').map(Number);
    const slotStartMin = sH * 60 + sM;
    const slotEndMin = slotStartMin + 30;

    return dayAppointments.filter((appt) => {
      const d = new Date(appt.startsAt);
      const apptMin = d.getHours() * 60 + d.getMinutes();
      return apptMin >= slotStartMin && apptMin < slotEndMin;
    });
  };

  const occupiedSlotsCount = useMemo(() => {
    return TIME_SLOTS.filter((slot) => getAppointmentsForSlot(slot).length > 0).length;
  }, [dayAppointments]);

  const availableSlotsCount = TIME_SLOTS.length - occupiedSlotsCount;

  const isProfessionalUser = session?.user?.role === 'PROFESSIONAL';

  return (
    <div
      className={
        viewMode === 'month'
          ? 'h-[calc(100vh-7.5rem)] flex flex-col space-y-2.5 text-foreground overflow-hidden'
          : 'space-y-4 text-foreground'
      }
    >
      {/* 1. Visualização Principal: Calendário Mensal */}
      {viewMode === 'month' && (
        <>
          {/* Header Unificado do Mês (Navegação + Seletor de Médico) */}
          <div className="bg-card border border-border px-4 py-2.5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            {/* Lado Esquerdo: Navegação de Mês */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-muted rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Mês anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-muted rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Próximo mês"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={handleTodayMonth}
                  className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-full transition-colors border border-primary/20 cursor-pointer"
                >
                  Hoje
                </button>
              </div>

              <h3 className="text-base sm:text-lg font-extrabold text-foreground capitalize tracking-tight flex items-center gap-2">
                <CalendarDays size={18} className="text-primary" />
                {currentTitle}
              </h3>
            </div>

            {/* Lado Direito: Seletor de Médico + Dica */}
            <div className="flex items-center gap-3">
              {!isProfessionalUser && professionals.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Médico:</span>
                  <select
                    className="px-3 py-1.5 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-xs font-medium"
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
              )}

              {currentProfessional && isProfessionalUser && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {currentProfessional.specialty}
                </span>
              )}

              <span className="hidden md:inline-flex text-[11px] text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-lg border border-border/60 items-center gap-1">
                <Sparkles size={12} className="text-primary" />
                Clique no dia para abrir os horários
              </span>
            </div>
          </div>

          {/* Grid do FullCalendar Mensal (Ocupa 100% da altura restante, ZERO scroll) */}
          <div className="flex-1 min-h-0 bg-card border border-border rounded-2xl shadow-sm p-3 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0">
              <FullCalendarComponent
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={false}
                locale="pt-br"
                events={monthSummaryEvents}
                dateClick={(info: any) => handleSelectDate(info.dateStr)}
                eventClick={(info: any) => {
                  if (info.event.extendedProps?.dateKey) {
                    handleSelectDate(info.event.extendedProps.dateKey);
                  }
                }}
                dayCellClassNames={handleDayCellClassNames}
                eventContent={renderMonthEventContent}
                height="100%"
                datesSet={handleDatesSet}
              />
            </div>
          </div>
        </>
      )}

      {/* 2. Visão Detalhada do Dia (Grade Diária 08:00 às 17:00 de 30 em 30 min) */}
      {viewMode === 'day' && (
        <div className="space-y-4">
          {/* Seletor de Médico na Visão Diária */}
          {!isProfessionalUser && professionals.length > 0 && (
            <div className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-muted-foreground">Selecionar Médico:</span>
                <select
                  className="px-4 py-2 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm font-medium"
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

              {currentProfessional && (
                <span className="hidden sm:inline-block text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Especialidade: {currentProfessional.specialty}
                </span>
              )}
            </div>
          )}

          {/* Barra Superior da Visão Diária */}
          <div className="bg-card border border-border p-5 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Botão de retorno evidente ao calendário */}
              <button
                onClick={handleReturnToMonth}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary font-semibold rounded-xl text-sm border border-primary/25 transition-all cursor-pointer w-fit shadow-xs"
              >
                <ArrowLeft size={16} /> Voltar ao Calendário Mensal
              </button>

              {/* Setas de navegação rápida de dia */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevDay}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-muted/50 hover:bg-muted text-foreground text-xs font-semibold rounded-xl border border-border transition-colors cursor-pointer"
          >
            <ChevronLeft size={15} /> Dia Anterior
          </button>
          <button
            onClick={handleTodayDay}
            className="px-3.5 py-2 bg-primary text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            Hoje
          </button>
          <button
            onClick={handleNextDay}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-muted/50 hover:bg-muted text-foreground text-xs font-semibold rounded-xl border border-border transition-colors cursor-pointer"
          >
            Próximo Dia <ChevronRight size={15} />
          </button>
        </div>
            </div>

            {/* Título com data por extenso e badges de resumo */ }
  <div className="pt-3 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-3">
    <div>
      <h3 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
        <Clock size={20} className="text-primary" />
        {formatFullDate(selectedDate)}
      </h3>
      <p className="text-xs text-muted-foreground mt-0.5">
        Horários de atendimento das 08:00 às 17:00 em intervalos de 30 minutos
      </p>
    </div>

    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
        {dayAppointments.length} {dayAppointments.length === 1 ? 'consulta marcada' : 'consultas marcadas'}
      </span>
      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
        {availableSlotsCount} {availableSlotsCount === 1 ? 'horário livre' : 'horários livres'}
      </span>
    </div>
  </div>
          </div >

    {/* Grade Vertical de Horários (08:00 às 17:00) */ }
    < div className = "bg-card border border-border p-6 rounded-2xl shadow-sm space-y-3" >
    {
      TIME_SLOTS.map((slot) => {
        const slotAppointments = getAppointmentsForSlot(slot);
        const isOccupied = slotAppointments.length > 0;

        return (
          <div
            key={slot.start}
            className="flex flex-col sm:flex-row sm:items-stretch gap-3 p-3 bg-muted/15 border border-border/70 rounded-2xl transition-all"
          >
            {/* Coluna do Horário */}
            <div className="sm:w-36 shrink-0 flex sm:flex-col items-center sm:items-start justify-between sm:justify-center px-3.5 py-2.5 bg-card border border-border/80 rounded-xl shadow-2xs">
              <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                <Clock size={15} className="text-primary shrink-0" />
                <span>{slot.start}</span>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">
                até {slot.end}
              </span>
            </div>

            {/* Conteúdo do Slot (Ocupado ou Livre) */}
            <div className="flex-1 min-w-0">
              {isOccupied ? (
                <div className="space-y-2">
                  {slotAppointments.map((appt) => {
                    const statusStyle = getStatusInfo(appt.status);
                    return (
                      <div
                        key={appt.id}
                        onClick={() => {
                          setSelectedAppointment(appt);
                          setErrorMsg('');
                          setCancelReason('');
                          setIsCancelling(false);
                          setShowModal(true);
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-md ${statusStyle.cardBg} ${statusStyle.borderLeft}`}
                        title="Clique para ver os detalhes da consulta"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center font-bold text-primary shrink-0 shadow-2xs text-sm">
                              {appt.patient.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-foreground truncate">
                                  {appt.patient.name}
                                </h4>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle.badge}`}
                                >
                                  {statusStyle.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                <span className="font-medium text-foreground/85">
                                  {currentProfessional?.specialty ||
                                    appt.professional?.specialty ||
                                    'Consulta Médica'}
                                </span>
                                <span>•</span>
                                <span className="truncate">{appt.patient.email}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            {appt.notes && (
                              <div
                                className="hidden md:flex items-center gap-1 text-xs text-muted-foreground max-w-xs truncate"
                                title={appt.notes}
                              >
                                <FileText size={13} className="shrink-0" />
                                <span className="truncate italic">"{appt.notes}"</span>
                              </div>
                            )}
                            <span className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                              Ver detalhes →
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full min-h-[52px] px-4 py-3 rounded-xl border border-dashed border-border/80 bg-card/60 flex items-center justify-between hover:bg-card transition-colors">
                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500/50" />
                    Nenhum atendimento agendado neste horário
                  </span>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    Disponível
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })
    }
          </div >
        </div >
      )
}

{/* 4. Modal de Detalhes da Consulta */ }
{
  showModal && selectedAppointment && (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 relative shadow-2xl">
        <button
          onClick={() => setShowModal(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
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
                <p className="text-sm text-foreground/80">{selectedAppointment.notes}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Status:</span>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${selectedAppointment.status === 'CONFIRMED'
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

        {/* Ações do Modal */}
        {selectedAppointment.status === 'SCHEDULED' && (
          <div className="flex flex-col gap-3">
            {!isCancelling ? (
              <div className="flex gap-3">
                <button
                  onClick={() => confirmMutation.mutate(selectedAppointment.id)}
                  className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                >
                  <Check size={18} /> Confirmar Consulta
                </button>
                <button
                  onClick={() => setIsCancelling(true)}
                  className="flex-1 py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl border border-rose-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Ban size={18} /> Cancelar Consulta
                </button>
              </div>
            ) : (
              <div className="space-y-4 pt-4 border-t border-border">
                <div>
                  <label className="block text-xs font-semibold text-foreground/80 mb-2">
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
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-sm cursor-pointer"
                  >
                    Confirmar Cancelamento
                  </button>
                  <button
                    onClick={() => setIsCancelling(false)}
                    className="px-4 py-2 bg-muted text-muted-foreground hover:text-foreground font-semibold rounded-xl text-sm border border-border cursor-pointer"
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
  )
}
    </div >
  );
}
