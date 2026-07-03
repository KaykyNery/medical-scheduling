'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { Plus, X, Edit, Trash, Activity, Clock, FileText, CheckCircle, Ban } from 'lucide-react';

const procedureSchema = zod.object({
  name: zod.string().min(3, 'Nome deve conter pelo menos 3 caracteres'),
  description: zod.string().optional(),
  duration: zod.number().min(1, 'A duração deve ser de pelo menos 1 minuto'),
});

type ProcedureFormData = zod.infer<typeof procedureSchema>;

interface Procedure {
  id: string;
  name: string;
  description?: string;
  duration: number;
  isActive: boolean;
  createdAt: string;
}

export default function ProcedimentosPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingProcedure, setEditingProcedure] = useState<Procedure | null>(null);
  const [formError, setFormError] = useState('');

  // Fetch active procedures
  const { data: procedures = [], isLoading } = useQuery<Procedure[]>({
    queryKey: ['procedures'],
    queryFn: async () => {
      const res = await api.get('/procedures');
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProcedureFormData>({
    resolver: zodResolver(procedureSchema),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProcedureFormData) => {
      await api.post('/procedures', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      setShowModal(false);
      reset();
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Erro ao cadastrar procedimento');
    },
  });

  // Edit mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProcedureFormData }) => {
      await api.patch(`/procedures/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      setShowModal(false);
      setEditingProcedure(null);
      reset();
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Erro ao atualizar procedimento');
    },
  });

  // Soft delete mutation (deactivate)
  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/procedures/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    },
  });

  const onSubmit = (data: ProcedureFormData) => {
    if (editingProcedure) {
      updateMutation.mutate({ id: editingProcedure.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEditClick = (procedure: Procedure) => {
    setEditingProcedure(procedure);
    reset({
      name: procedure.name,
      description: procedure.description || '',
      duration: procedure.duration,
    });
    setFormError('');
    setShowModal(true);
  };

  return (
    <div className="space-y-8 text-foreground">
      <div className="flex justify-between items-center bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold">Procedimentos Clínicos</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie os serviços oferecidos e seus tempos de atendimento</p>
        </div>
        <button
          onClick={() => {
            setEditingProcedure(null);
            reset({
              name: '',
              description: '',
              duration: 30,
            });
            setFormError('');
            setShowModal(true);
          }}
          className="px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={16} />
          Novo Procedimento
        </button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-12">Carregando procedimentos...</p>
      ) : procedures.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-3xl p-6">
          <p className="text-muted-foreground font-medium">Nenhum procedimento cadastrado no momento.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider">
                  <th className="p-4 pl-6">Nome</th>
                  <th className="p-4">Descrição</th>
                  <th className="p-4">Duração</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                {procedures.map((proc) => (
                  <tr key={proc.id} className="hover:bg-muted/10 transition-colors">
                    <td className="p-4 pl-6 font-bold text-foreground">{proc.name}</td>
                    <td className="p-4 text-muted-foreground max-w-xs truncate">{proc.description || '-'}</td>
                    <td className="p-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock size={13} className="text-primary" /> {proc.duration} min
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          proc.isActive
                            ? 'bg-sky-500/10 text-sky-600 border border-sky-500/20'
                            : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                        }`}
                      >
                        {proc.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right space-x-2">
                      <button
                        onClick={() => handleEditClick(proc)}
                        className="p-1.5 hover:bg-muted rounded-lg text-slate-500 hover:text-foreground transition-colors cursor-pointer inline-flex items-center"
                        title="Editar"
                      >
                        <Edit size={14} />
                      </button>
                      {proc.isActive && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Deseja realmente desativar o procedimento ${proc.name}?`)) {
                              deactivateMutation.mutate(proc.id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-500 hover:text-rose-600 transition-colors cursor-pointer inline-flex items-center"
                          title="Desativar"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Criar/Editar Procedimento */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg p-6 relative shadow-2xl space-y-6">
            <button
              onClick={() => {
                setShowModal(false);
                setEditingProcedure(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-foreground rounded-lg hover:bg-muted cursor-pointer"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-lg font-bold text-foreground">
                {editingProcedure ? 'Editar Procedimento' : 'Novo Procedimento Clínico'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Defina as informações essenciais para os serviços de atendimento</p>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Nome do Procedimento</label>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="Ex: Consulta Odontológica, Limpeza"
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                />
                {errors.name && <p className="text-[10px] text-rose-500">{errors.name.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Duração Estimada (Minutos)</label>
                <input
                  type="number"
                  {...register('duration', { valueAsNumber: true })}
                  placeholder="30"
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground"
                />
                {errors.duration && <p className="text-[10px] text-rose-500">{errors.duration.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Descrição / Notas (Opcional)</label>
                <textarea
                  {...register('description')}
                  placeholder="Ex: Realização de exames preventivos..."
                  rows={4}
                  className="w-full px-3 py-2 bg-muted/30 border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-foreground resize-none"
                />
                {errors.description && <p className="text-[10px] text-rose-500">{errors.description.message}</p>}
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-border/40 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProcedure(null);
                  }}
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
                  {isSubmitting ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
