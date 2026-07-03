'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { User, Phone, Mail, FileText, Check, Plus, X, Award, Clock, Calendar, CheckSquare, Square } from 'lucide-react';

const doctorSchema = zod.object({
  name: zod.string().min(3, 'Nome deve conter pelo menos 3 caracteres'),
  email: zod.string().email('E-mail inválido'),
  phone: zod.string().min(8, 'Telefone deve conter pelo menos 8 dígitos'),
  specialty: zod.string().min(3, 'Especialidade inválida'),
  registrationId: zod.string().min(4, 'Registro profissional (CRM) inválido'),
  slotDuration: zod.number(),
  availabilities: zod.array(
    zod.object({
      dayOfWeek: zod.number(),
      startTime: zod.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
      endTime: zod.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
      enabled: zod.boolean().optional(),
    })
  ).refine(
    (arr) => arr.some((item) => item.enabled),
    'Selecione pelo menos um dia de atendimento'
  ),
});

type DoctorFormData = zod.infer<typeof doctorSchema>;

interface Professional {
  id: string;
  specialty: string;
  registrationId: string;
  isActive: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  availabilities: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }[];
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

export default function MedicosPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'activate' | 'deactivate' } | null>(null);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);

  // Fetch all professionals (admins fetch complete list)
  const { data: professionals = [], isLoading } = useQuery<Professional[]>({
    queryKey: ['professionals'],
    queryFn: async () => {
      const res = await api.get('/professionals');
      return res.data;
    },
  });

  const defaultAvailabilities = DAYS_OF_WEEK.map((day) => ({
    dayOfWeek: day.value,
    startTime: '08:00',
    endTime: '18:00',
    enabled: day.value >= 1 && day.value <= 5, // Default Mon-Fri checked
  }));

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DoctorFormData>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      specialty: '',
      registrationId: '',
      slotDuration: 30,
      availabilities: defaultAvailabilities,
    },
  });

  const { fields } = useFieldArray({
    control,
    name: 'availabilities',
  });

  // Create Professional mutation
  const createMutation = useMutation({
    mutationFn: async (data: DoctorFormData) => {
      // Filter out disabled availabilities
      const activeAvailabilities = data.availabilities
        .filter((item) => item.enabled)
        .map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));

      await api.post('/professionals', {
        ...data,
        availabilities: activeAvailabilities,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
      setShowModal(false);
      reset();
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Erro ao cadastrar profissional');
    },
  });

  // Update Professional mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: DoctorFormData }) => {
      // Filter out disabled availabilities
      const activeAvailabilities = data.availabilities
        .filter((item) => item.enabled)
        .map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime }));

      await api.put(`/professionals/${id}`, {
        name: data.name,
        email: data.email,
        phone: data.phone,
        specialty: data.specialty,
        registrationId: data.registrationId,
        availabilities: activeAvailabilities,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
      setShowModal(false);
      setEditingProfessional(null);
      reset();
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Erro ao editar profissional');
    },
  });

  // Change status mutation (activate/deactivate)
  const changeStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.patch(`/professionals/${id}/status`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['professionals'] });
    },
  });

  const onSubmit = (data: DoctorFormData) => {
    if (editingProfessional) {
      updateMutation.mutate({ id: editingProfessional.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-8 text-foreground">
      <div className="flex justify-between items-center bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold">Cadastro de Médicos</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Gerenciamento de profissionais e horários de atendimento</p>
        </div>
        <button
          onClick={() => {
            setEditingProfessional(null);
            reset();
            setFormError('');
            setShowModal(true);
          }}
          className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={16} />
          Novo Médico
        </button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-12">Carregando médicos...</p>
      ) : professionals.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-3xl p-6">
          <p className="text-muted-foreground font-medium">Nenhum médico cadastrado no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {professionals.map((prof) => (
            <div
              key={prof.id}
              className={`bg-card border rounded-3xl p-6 shadow-sm flex flex-col justify-between transition-all ${
                prof.isActive ? 'border-border hover:border-slate-350' : 'border-dashed border-slate-300 opacity-70'
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-bold text-base text-foreground">{prof.user.name}</h3>
                    <p className="text-xs text-primary font-semibold uppercase tracking-wider">{prof.specialty}</p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      prof.isActive
                        ? 'bg-sky-500/10 text-sky-600 border border-sky-500/20'
                        : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                    }`}
                  >
                    {prof.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-border/40 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Award size={14} className="text-slate-400" />
                    <span>CRM: <strong className="text-foreground">{prof.registrationId}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail size={14} className="text-slate-400" />
                    <span>{prof.user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone size={14} className="text-slate-400" />
                    <span>{prof.user.phone}</span>
                  </div>
                </div>

                {prof.availabilities.length > 0 && (
                  <div className="pt-3 border-t border-border/40">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Dias de Atendimento</p>
                    <div className="flex flex-wrap gap-1.5">
                      {prof.availabilities.map((av, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-muted text-muted-foreground border border-border/60 rounded text-[9px] font-semibold"
                        >
                          {DAYS_OF_WEEK.find((d) => d.value === av.dayOfWeek)?.label.split('-')[0]}: {av.startTime}-{av.endTime}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-border/40">
                {confirmAction?.id === prof.id ? (
                  <div className="flex items-center justify-between gap-3 text-xs w-full animate-in fade-in slide-in-from-bottom-1 duration-200">
                    <span className="font-semibold text-muted-foreground">
                      {confirmAction.action === 'activate' ? 'Ativar profissional?' : 'Desativar profissional?'}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          changeStatusMutation.mutate({
                            id: prof.id,
                            isActive: confirmAction.action === 'activate',
                          });
                          setConfirmAction(null);
                        }}
                        className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                      >
                        Sim
                      </button>
                      <button
                        onClick={() => setConfirmAction(null)}
                        className="px-3 py-1.5 border border-border text-muted-foreground font-semibold rounded-xl hover:bg-muted transition-colors cursor-pointer"
                      >
                        Não
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center w-full">
                    <button
                      onClick={() => {
                        setEditingProfessional(prof);
                        setFormError('');

                        // Map doctor availabilities to form representation
                        const mappedAvailabilities = DAYS_OF_WEEK.map((day) => {
                          const existingAv = prof.availabilities.find((av) => av.dayOfWeek === day.value);
                          return {
                            dayOfWeek: day.value,
                            startTime: existingAv ? existingAv.startTime.slice(0, 5) : '08:00',
                            endTime: existingAv ? existingAv.endTime.slice(0, 5) : '18:00',
                            enabled: !!existingAv,
                          };
                        });

                        reset({
                          name: prof.user.name,
                          email: prof.user.email,
                          phone: prof.user.phone,
                          specialty: prof.specialty,
                          registrationId: prof.registrationId,
                          slotDuration: 30,
                          availabilities: mappedAvailabilities,
                        });

                        setShowModal(true);
                      }}
                      className="px-3 py-1.5 border border-primary/25 text-primary hover:bg-primary/5 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Editar
                    </button>

                    {prof.isActive ? (
                      <button
                        onClick={() => setConfirmAction({ id: prof.id, action: 'deactivate' })}
                        className="px-3 py-1.5 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        Desativar
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmAction({ id: prof.id, action: 'activate' })}
                        className="px-3 py-1.5 border border-sky-250 text-sky-600 hover:bg-sky-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        Ativar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo Médico */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl space-y-6">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-lg font-bold text-foreground">
                {editingProfessional ? 'Editar Profissional de Saúde' : 'Novo Profissional de Saúde'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {editingProfessional
                  ? 'Atualize os dados e a escala de trabalho do médico'
                  : 'Cadastre médicos e configure suas agendas de trabalho'}
              </p>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Informações Pessoais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Nome Completo</label>
                  <input
                    type="text"
                    {...register('name')}
                    placeholder="Ex: Dr. Roberto Alves"
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                  {errors.name && <p className="text-[10px] text-rose-500">{errors.name.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">E-mail</label>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="roberto@clinica.com"
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                  {errors.email && <p className="text-[10px] text-rose-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Telefone</label>
                  <input
                    type="text"
                    {...register('phone')}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                  {errors.phone && <p className="text-[10px] text-rose-500">{errors.phone.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">CRM / Registro Profissional</label>
                  <input
                    type="text"
                    {...register('registrationId')}
                    placeholder="CRM/SP 123456"
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                  {errors.registrationId && (
                    <p className="text-[10px] text-rose-500">{errors.registrationId.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Especialidade Médica</label>
                  <input
                    type="text"
                    {...register('specialty')}
                    placeholder="Ex: Pediatria, Cardiologia"
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                  {errors.specialty && <p className="text-[10px] text-rose-500">{errors.specialty.message}</p>}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Duração da Consulta (Minutos)</label>
                  <select
                    {...register('slotDuration', { valueAsNumber: true })}
                    className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                  >
                    <option value={15}>15 minutos</option>
                    <option value={20}>20 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={45}>45 minutos</option>
                    <option value={60}>60 minutos</option>
                  </select>
                </div>
              </div>

              {/* Disponibilidade Semanal */}
              <div className="pt-4 border-t border-border/40 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Disponibilidade Semanal</h4>
                  <p className="text-[10px] text-muted-foreground">Marque os dias de atendimento e defina os horários de início e término</p>
                </div>

                {errors.availabilities && (
                  <p className="text-[10px] text-rose-500">{errors.availabilities.root?.message || errors.availabilities.message}</p>
                )}

                <div className="space-y-2">
                  {fields.map((field, index) => {
                    const isDayEnabled = watch(`availabilities.${index}.enabled`);
                    return (
                      <div
                        key={field.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                          isDayEnabled ? 'bg-card border-border' : 'bg-muted/10 border-border/30 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setValue(`availabilities.${index}.enabled`, !isDayEnabled)}
                            className="text-primary focus:outline-none cursor-pointer"
                          >
                            {isDayEnabled ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-300" />}
                          </button>
                          <span className="text-xs font-semibold text-foreground w-24">
                            {DAYS_OF_WEEK.find((d) => d.value === field.dayOfWeek)?.label}
                          </span>
                        </div>

                        {isDayEnabled && (
                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold">Início</span>
                              <input
                                type="text"
                                {...register(`availabilities.${index}.startTime`)}
                                placeholder="08:00"
                                className="w-16 px-2 py-1 bg-muted/40 border border-border rounded-lg text-center focus:outline-none"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground uppercase font-bold">Término</span>
                              <input
                                type="text"
                                {...register(`availabilities.${index}.endTime`)}
                                placeholder="18:00"
                                className="w-16 px-2 py-1 bg-muted/40 border border-border rounded-lg text-center focus:outline-none"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-3 pt-6 border-t border-border/40 text-xs">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-border text-muted-foreground font-semibold rounded-xl hover:bg-muted transition-colors cursor-pointer"
                  disabled={isSubmitting}
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? (editingProfessional ? 'Salvando...' : 'Cadastrando...')
                    : (editingProfessional ? 'Salvar Alterações' : 'Confirmar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
