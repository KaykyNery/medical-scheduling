'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { Search, Calendar, Phone, Mail, FileText, ChevronRight, X, User } from 'lucide-react';

interface UserType {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Professional {
  id: string;
  specialty: string;
  user: {
    name: string;
  };
}

interface Appointment {
  id: string;
  startsAt: string;
  endsAt: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED';
  notes?: string;
  patient: UserType;
  professional: Professional;
}

interface PatientStats extends UserType {
  appointmentsCount: number;
  lastAppointment: string;
}

export default function PacientesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientStats | null>(null);

  // Fetch all appointments
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ['appointments-list'],
    queryFn: async () => {
      const res = await api.get('/scheduling/appointments');
      return res.data;
    },
  });

  // Fetch individual patient's history
  const { data: patientHistory = [], isFetching: historyFetching } = useQuery<Appointment[]>({
    queryKey: ['patient-history', selectedPatient?.id],
    queryFn: async () => {
      if (!selectedPatient?.id) return [];
      const res = await api.get(`/scheduling/users/${selectedPatient.id}/appointments`);
      return res.data;
    },
    enabled: !!selectedPatient?.id,
  });

  // Extract unique patients with stats
  const patientsMap = new Map<string, PatientStats>();
  appointments.forEach((appt) => {
    if (appt.patient) {
      const existing = patientsMap.get(appt.patient.id);
      const apptDate = new Date(appt.startsAt).getTime();
      const lastDate = existing ? new Date(existing.lastAppointment).getTime() : 0;

      patientsMap.set(appt.patient.id, {
        id: appt.patient.id,
        name: appt.patient.name,
        email: appt.patient.email,
        phone: appt.patient.phone,
        appointmentsCount: (existing?.appointmentsCount || 0) + 1,
        lastAppointment: apptDate > lastDate ? appt.startsAt : (existing?.lastAppointment || appt.startsAt),
      });
    }
  });

  const patientsList = Array.from(patientsMap.values());

  const filteredPatients = patientsList.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 relative text-foreground">
      {/* Search and stats bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card border border-border p-5 rounded-2xl shadow-sm">
        <div className="relative w-full md:max-w-md">
          <Search size={18} className="absolute left-4 top-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-11 pr-4 py-3 bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Total de Pacientes: <strong className="text-foreground font-semibold">{patientsList.length}</strong>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        {isLoading ? (
          <p className="text-muted-foreground text-center py-12">Carregando pacientes...</p>
        ) : filteredPatients.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Nenhum paciente encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">Nome</th>
                  <th className="py-4 px-6">Contato</th>
                  <th className="py-4 px-6 text-center">Consultas</th>
                  <th className="py-4 px-6">Última Consulta</th>
                  <th className="py-4 px-6">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-semibold text-foreground flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm">
                        {patient.name.charAt(0)}
                      </div>
                      {patient.name}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-350 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Mail size={14} className="text-muted-foreground" /> {patient.email}
                      </div>
                      {patient.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone size={14} className="text-muted-foreground" /> {patient.phone}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {patient.appointmentsCount}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-500">
                      {new Date(patient.lastAppointment).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => setSelectedPatient(patient)}
                        className="py-1.5 px-3 bg-card hover:bg-muted text-foreground text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors border border-border"
                      >
                        Prontuário <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient Profile Drawer */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-card border-l border-border w-full max-w-lg h-full p-8 relative flex flex-col shadow-2xl">
            <button
              onClick={() => setSelectedPatient(null)}
              className="absolute top-6 left-6 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
            >
              <X size={18} />
            </button>

            <div className="mt-8 flex flex-col items-center border-b border-border pb-6 mb-6">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-2xl border border-primary/20 mb-3">
                {selectedPatient.name.charAt(0)}
              </div>
              <h3 className="text-xl font-bold text-foreground">{selectedPatient.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{selectedPatient.email}</p>
              {selectedPatient.phone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Phone size={12} className="text-primary" /> {selectedPatient.phone}
                </p>
              )}
            </div>

            {/* History section */}
            <h4 className="font-bold text-foreground mb-4">Histórico de Consultas</h4>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {historyFetching ? (
                <p className="text-muted-foreground text-sm py-4">Buscando histórico...</p>
              ) : patientHistory.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">Nenhum histórico encontrado.</p>
              ) : (
                patientHistory.map((appt) => (
                  <div
                    key={appt.id}
                    className="p-4 bg-muted/20 border border-border rounded-xl space-y-3"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar size={12} className="text-primary" />
                        {new Date(appt.startsAt).toLocaleDateString('pt-BR')}
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          appt.status === 'CONFIRMED'
                            ? 'bg-sky-500/10 text-sky-600 border border-sky-500/20'
                            : appt.status === 'CANCELLED'
                            ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            : 'bg-primary/10 text-primary border border-primary/20'
                        }`}
                      >
                        {appt.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Profissional</p>
                      <p className="text-sm font-semibold text-foreground">{appt.professional.user.name}</p>
                      <p className="text-xs text-muted-foreground">{appt.professional.specialty}</p>
                    </div>

                    {appt.notes && (
                      <div className="space-y-1 pt-1 border-t border-border/40">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText size={12} /> Observações
                        </p>
                        <p className="text-xs text-slate-650">{appt.notes}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
