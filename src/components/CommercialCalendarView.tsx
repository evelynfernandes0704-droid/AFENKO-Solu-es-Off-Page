import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Phone,
  Video,
  Send,
  Mail,
  Trash2,
  User,
  Filter,
} from 'lucide-react';
import {
  CommercialAppointment,
  AppointmentType,
  Lead,
  TEAM_EMPLOYEES,
  formatWhatsAppDeepLink,
} from '../types';
import {
  fetchAllAppointments,
  createAppointmentInDb,
  updateAppointmentInDb,
  deleteAppointmentFromDb,
} from '../firebase';

interface CommercialCalendarViewProps {
  currentUsername: string;
  currentDisplayName: string;
  isAdmin: boolean;
  leads: Lead[];
  onOpenLeadHistory?: (lead: Lead) => void;
  preselectedLead?: Lead | null;
}

export const CommercialCalendarView: React.FC<CommercialCalendarViewProps> = ({
  currentUsername,
  currentDisplayName,
  isAdmin,
  leads,
  onOpenLeadHistory,
  preselectedLead,
}) => {
  const [appointments, setAppointments] = useState<CommercialAppointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [employeeFilter, setEmployeeFilter] = useState<string>(
    isAdmin ? 'all' : currentUsername
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // New appointment modal
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(Boolean(preselectedLead));
  const [newTitle, setNewTitle] = useState<string>(
    preselectedLead ? `Retorno: ${preselectedLead.companyName}` : ''
  );
  const [newLeadId, setNewLeadId] = useState<string>(preselectedLead?.id || '');
  const [newType, setNewType] = useState<AppointmentType>('whatsapp');
  const [newDate, setNewDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [newTime, setNewTime] = useState<string>('14:00');
  const [newNotes, setNewNotes] = useState<string>('');
  const [newAssignedTo, setNewAssignedTo] = useState<string>(
    isAdmin
      ? preselectedLead?.assignedTo || TEAM_EMPLOYEES[0].username
      : currentUsername
  );
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await fetchAllAppointments(isAdmin ? 'all' : currentUsername);
      setAppointments(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [isAdmin, currentUsername]);

  useEffect(() => {
    if (preselectedLead) {
      setNewLeadId(preselectedLead.id);
      setNewTitle(`Retorno: ${preselectedLead.companyName}`);
      if (preselectedLead.assignedTo) {
        setNewAssignedTo(preselectedLead.assignedTo);
      }
      setIsNewModalOpen(true);
    }
  }, [preselectedLead]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate || !newTime) return;

    setSubmitting(true);
    try {
      const targetLead = leads.find((l) => l.id === newLeadId);
      const assignedEmp = TEAM_EMPLOYEES.find((e) => e.username === newAssignedTo);

      const created = await createAppointmentInDb({
        leadId: newLeadId || undefined,
        leadCompanyName: targetLead?.companyName || (newLeadId ? 'Cliente Vinculado' : 'Prospecção'),
        leadPhone: targetLead?.phone,
        leadContactName: targetLead?.responsibleName,
        assignedTo: newAssignedTo,
        assignedToName: assignedEmp?.displayName || currentDisplayName,
        title: newTitle.trim(),
        type: newType,
        date: newDate,
        time: newTime,
        notes: newNotes.trim() || undefined,
        status: 'pendente',
      });

      setAppointments((prev) => [created, ...prev]);
      setIsNewModalOpen(false);
      setNewTitle('');
      setNewNotes('');
      setNewLeadId('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (appt: CommercialAppointment) => {
    const nextStatus = appt.status === 'pendente' ? 'concluido' : 'pendente';
    setAppointments((prev) =>
      prev.map((a) => (a.id === appt.id ? { ...a, status: nextStatus } : a))
    );
    await updateAppointmentInDb(appt.id, { status: nextStatus });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este compromisso?')) return;
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    await deleteAppointmentFromDb(id);
  };

  // Filter appointments
  const filteredAppointments = appointments.filter((appt) => {
    if (!isAdmin && appt.assignedTo !== currentUsername) return false;
    if (isAdmin && employeeFilter !== 'all' && appt.assignedTo !== employeeFilter) {
      return false;
    }
    if (statusFilter === 'pending' && appt.status !== 'pendente') return false;
    if (statusFilter === 'completed' && appt.status !== 'concluido') return false;
    return true;
  });

  // Sort by date and time
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const timeA = new Date(`${a.date}T${a.time}`).getTime();
    const timeB = new Date(`${b.date}T${b.time}`).getTime();
    return timeA - timeB;
  });

  const pendingCount = appointments.filter(
    (a) => (!isAdmin ? a.assignedTo === currentUsername : true) && a.status === 'pendente'
  ).length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = appointments.filter(
    (a) => (!isAdmin ? a.assignedTo === currentUsername : true) && a.date === todayStr && a.status === 'pendente'
  ).length;

  const getTypeBadge = (type: AppointmentType) => {
    switch (type) {
      case 'reuniao':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
            <Video className="w-3 h-3" /> Reunião / Meet
          </span>
        );
      case 'ligacao':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
            <Phone className="w-3 h-3" /> Ligação Telefônica
          </span>
        );
      case 'whatsapp':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <Send className="w-3 h-3" /> Follow-up WhatsApp
          </span>
        );
      case 'email':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
            <Mail className="w-3 h-3" /> E-mail Comercial
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <span>Rotina Comercial Organizada</span>
            <span aria-hidden="true">·</span>
            <span>{isAdmin ? 'Visão Geral da Equipe' : `Agenda de ${currentDisplayName}`}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            Agenda Comercial & Retornos
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Organize reuniões, acompanhe tarefas pendentes e evite que contatos comerciais sejam esquecidos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Hoje</div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">
              {todayCount}
            </div>
          </div>

          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pendentes</div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {pendingCount}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="h-11 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-2 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Compromisso</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Filtros:</span>

          {isAdmin && (
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="all">Equipe: Todos os Funcionários</option>
              {TEAM_EMPLOYEES.map((emp) => (
                <option key={emp.username} value={emp.username}>
                  {emp.displayName}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Todos ({appointments.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                statusFilter === 'pending'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Pendentes ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                statusFilter === 'completed'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Concluídos
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={loadAppointments}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          Atualizar Agenda
        </button>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sortedAppointments.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mx-auto">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Nenhum compromisso encontrado para este filtro
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Clique em "+ Novo Compromisso" para agendar reuniões, follow-ups de WhatsApp ou ligações com os clientes.
            </p>
          </div>
        ) : (
          sortedAppointments.map((appt) => {
            const isCompleted = appt.status === 'concluido';
            const isToday = appt.date === todayStr;
            const isPast = appt.date < todayStr && !isCompleted;
            const targetLead = leads.find((l) => l.id === appt.leadId);

            return (
              <div
                key={appt.id}
                className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCompleted
                    ? 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                    : isPast
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                    : isToday
                    ? 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(appt)}
                    title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluído'}
                    className={`mt-0.5 p-1 rounded-lg transition-colors shrink-0 ${
                      isCompleted
                        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                        : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {getTypeBadge(appt.type)}
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        {appt.date.split('-').reverse().join('/')} às {appt.time}
                      </span>
                      {isToday && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px] uppercase">
                          Hoje
                        </span>
                      )}
                      {isPast && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px] uppercase">
                          Atrasado
                        </span>
                      )}
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600 dark:text-slate-300 font-medium">
                        Resp: {appt.assignedToName}
                      </span>
                    </div>

                    <h4
                      className={`text-sm font-bold text-slate-900 dark:text-white truncate ${
                        isCompleted ? 'line-through text-slate-500' : ''
                      }`}
                    >
                      {appt.title}
                    </h4>

                    {appt.leadCompanyName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span>Empresa: <strong>{appt.leadCompanyName}</strong></span>
                        {appt.leadPhone && <span>· Tel: {appt.leadPhone}</span>}
                      </p>
                    )}

                    {appt.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        {appt.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {appt.leadPhone && (
                    <a
                      href={formatWhatsAppDeepLink(
                        appt.leadPhone,
                        `Olá! Aqui é ${appt.assignedToName} da Afenko — Soluções Off-Page. Conforme nosso compromisso agendado para hoje, podemos conversar?`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1 transition-colors"
                      title="Chamar no WhatsApp"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>
                  )}

                  {targetLead && onOpenLeadHistory && (
                    <button
                      type="button"
                      onClick={() => onOpenLeadHistory(targetLead)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Histórico
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(appt.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors"
                    title="Excluir compromisso"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Appointment Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl my-6">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Novo Compromisso Comercial
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Agende retornos, reuniões ou ligações para a rotina de vendas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Título do Compromisso *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Retorno de proposta com Dr. Carlos"
                  required
                  className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    required
                    className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Horário *
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    required
                    className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Canal / Tipo
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as AppointmentType)}
                    className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="whatsapp">Follow-up WhatsApp</option>
                    <option value="ligacao">Ligação Telefônica</option>
                    <option value="reuniao">Reunião Online (Meet)</option>
                    <option value="email">E-mail Comercial</option>
                  </select>
                </div>

                {isAdmin ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Funcionário Responsável
                    </label>
                    <select
                      value={newAssignedTo}
                      onChange={(e) => setNewAssignedTo(e.target.value)}
                      className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                    >
                      {TEAM_EMPLOYEES.map((emp) => (
                        <option key={emp.username} value={emp.username}>
                          {emp.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Responsável
                    </label>
                    <div className="w-full h-10 px-3 text-xs bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center text-slate-700 dark:text-slate-300">
                      {currentDisplayName}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Vincular a Empresa / Lead (Opcional)
                </label>
                <select
                  value={newLeadId}
                  onChange={(e) => {
                    setNewLeadId(e.target.value);
                    const found = leads.find((l) => l.id === e.target.value);
                    if (found && !newTitle) {
                      setNewTitle(`Retorno: ${found.companyName}`);
                    }
                  }}
                  className="w-full h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="">Nenhum lead vinculado</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.companyName} ({l.niche})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Observações / Pauta
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  rows={3}
                  placeholder="Ex: Cliente tem interesse na landing page, mas quer parcelar em 3x. Apresentar portfólio."
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {submitting ? 'Salvando...' : 'Salvar Compromisso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
