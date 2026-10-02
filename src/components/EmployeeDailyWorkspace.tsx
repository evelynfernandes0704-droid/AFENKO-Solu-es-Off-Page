import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  TrendingUp,
  Target,
  DollarSign,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  Award,
  ChevronRight,
  ListTodo,
  Plus,
  Trash2,
  Megaphone,
} from 'lucide-react';
import { Lead, CompanyNotice } from '../types';

interface EmployeeDailyWorkspaceProps {
  currentUsername: string;
  currentDisplayName: string;
  isAdmin: boolean;
  myLeads: Lead[];
  onOpenPlaybook: () => void;
  onNavigateTab: (tab: 'spreadsheet' | 'funnel' | 'calendar') => void;
}

const DEFAULT_NOTICES: CompanyNotice[] = [
  {
    id: 'notice-1',
    title: '📢 Foco Comercial da Semana: Clínicas & Escritórios',
    message:
      'Priorizem o contato com empresas de saúde e advocacia mapeadas. Evelyn autorizou parcelamento em até 3x para fechamentos realizados até sexta-feira.',
    author: 'Evelyn Fernandes (Gestora)',
    priority: 'alta',
    createdAt: new Date().toISOString(),
    pinned: true,
  },
];

export const EmployeeDailyWorkspace: React.FC<EmployeeDailyWorkspaceProps> = ({
  currentUsername,
  currentDisplayName,
  isAdmin,
  myLeads,
  onOpenPlaybook,
  onNavigateTab,
}) => {
  // ----------------------------------------------------
  // 1. Mural de Avisos da Gestora
  // ----------------------------------------------------
  const [notices, setNotices] = useState<CompanyNotice[]>(() => {
    try {
      const stored = localStorage.getItem('afenko_company_notices');
      return stored ? JSON.parse(stored) : DEFAULT_NOTICES;
    } catch {
      return DEFAULT_NOTICES;
    }
  });
  const [showNewNoticeModal, setShowNewNoticeModal] = useState(false);
  const [newNoticeTitle, setNewNoticeTitle] = useState('');
  const [newNoticeMsg, setNewNoticeMsg] = useState('');
  const [acknowledgedNotices, setAcknowledgedNotices] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(`afenko_notices_ack_${currentUsername}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const saveNotices = (updated: CompanyNotice[]) => {
    setNotices(updated);
    try {
      localStorage.setItem('afenko_company_notices', JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao salvar avisos:', e);
    }
  };

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoticeTitle.trim() || !newNoticeMsg.trim()) return;
    const item: CompanyNotice = {
      id: `notice-${Date.now()}`,
      title: newNoticeTitle.trim(),
      message: newNoticeMsg.trim(),
      author: 'Evelyn Fernandes (Gestora)',
      priority: 'alta',
      createdAt: new Date().toISOString(),
      pinned: true,
    };
    saveNotices([item, ...notices]);
    setNewNoticeTitle('');
    setNewNoticeMsg('');
    setShowNewNoticeModal(false);
  };

  const handleDeleteNotice = (id: string) => {
    saveNotices(notices.filter((n) => n.id !== id));
  };

  const handleAcknowledgeNotice = (id: string) => {
    const updated = { ...acknowledgedNotices, [id]: true };
    setAcknowledgedNotices(updated);
    try {
      localStorage.setItem(`afenko_notices_ack_${currentUsername}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao salvar ciente:', e);
    }
  };

  // ----------------------------------------------------
  // 2. Termômetro de Metas & Simulador de Comissões
  // ----------------------------------------------------
  const proposalsSent = myLeads.filter(
    (l) =>
      l.funnelStage === 'proposta_enviada' ||
      l.funnelStage === 'em_negociacao' ||
      l.funnelStage === 'fechado'
  ).length;

  const closedDeals = myLeads.filter((l) => l.funnelStage === 'fechado');
  const closedCount = closedDeals.length;
  const totalRevenue = closedDeals.reduce((acc, l) => acc + (l.proposalValue || 1490), 0);

  // Commission rate (default 10%, editable or switchable)
  const [commissionPct, setCommissionPct] = useState<number>(10);
  const myCommission = (totalRevenue * commissionPct) / 100;

  // Goals
  const proposalGoal = 15;
  const closedGoal = 3;
  const proposalProgress = Math.min(100, Math.round((proposalsSent / proposalGoal) * 100));
  const closedProgress = Math.min(100, Math.round((closedCount / closedGoal) * 100));

  // ----------------------------------------------------
  // 3. Checklist Diário do Vendedor ("Rotina Comercial 100%")
  // ----------------------------------------------------
  const todayKey = new Date().toISOString().split('T')[0];
  const [dailyChecklist, setDailyChecklist] = useState({
    followupDone: false,
    appointmentsDone: false,
    newProposalsDone: false,
    crmUpdatedDone: false,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`afenko_checklist_${currentUsername}_${todayKey}`);
      if (saved) {
        setDailyChecklist(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Erro ao carregar checklist:', e);
    }
  }, [currentUsername, todayKey]);

  const toggleChecklistItem = (key: keyof typeof dailyChecklist) => {
    const updated = { ...dailyChecklist, [key]: !dailyChecklist[key] };
    setDailyChecklist(updated);
    try {
      localStorage.setItem(`afenko_checklist_${currentUsername}_${todayKey}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Erro ao salvar checklist:', e);
    }
  };

  const completedCount = Object.values(dailyChecklist).filter(Boolean).length;
  const checklistPct = Math.round((completedCount / 4) * 100);

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* 1. Mural de Avisos da Gestora */}
      {notices.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-blue-800/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-200">
                  Mural da Gestão · Evelyn Fernandes
                </h3>
                <span className="text-[11px] text-blue-300/80">
                  Comunicados e alinhamentos oficiais para a equipe
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowNewNoticeModal(true)}
                  className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Publicar Aviso</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {notices.map((notice) => {
              const isAck = acknowledgedNotices[notice.id];
              return (
                <div
                  key={notice.id}
                  className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 max-w-3xl">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">
                        {notice.title}
                      </span>
                      <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded font-semibold">
                        Prioritário
                      </span>
                    </div>
                    <p className="text-blue-100 text-xs leading-relaxed">
                      {notice.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleAcknowledgeNotice(notice.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                          isAck
                            ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/30'
                            : 'bg-white text-slate-900 hover:bg-blue-50 shadow-sm'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isAck ? 'Ciente registrado' : 'Marcar como Ciente'}</span>
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteNotice(notice.id)}
                        className="p-1.5 text-rose-300 hover:text-white rounded-lg hover:bg-rose-500/20 transition-colors"
                        title="Excluir comunicado"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid: Metas / Comissões & Checklist Diário */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Termômetro de Metas & Simulador de Comissões (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Desempenho Comercial & Comissões
                </h3>
                <span className="text-[11px] text-slate-500">
                  Acompanhamento individual de vendas de {currentDisplayName}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenPlaybook}
              className="px-3 py-1.5 text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-purple-600" />
              <span>Scripts & Objeções</span>
            </button>
          </div>

          {/* Progress Bars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
            {/* Meta de Propostas */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-blue-600" />
                  <span>Propostas Enviadas</span>
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {proposalsSent} / {proposalGoal}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${proposalProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 block text-right font-medium">
                {proposalProgress}% da meta da semana
              </span>
            </div>

            {/* Meta de Fechamentos */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Contratos Fechados</span>
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {closedCount} / {closedGoal}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${closedProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-500 block text-right font-medium">
                {closedProgress}% da meta de contratos
              </span>
            </div>
          </div>

          {/* Simulador de Comissões Card */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                <span>Simulador de Comissão Acumulada (Mês)</span>
              </div>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Vendas fechadas por você: <strong>{closedCount} empresas</strong> (Total R${' '}
                {totalRevenue.toLocaleString('pt-BR')})
              </p>
            </div>

            <div className="flex items-center gap-3 sm:border-l sm:border-emerald-200 sm:pl-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block uppercase">
                  Sua Comissão ({commissionPct}%):
                </span>
                <span className="text-lg font-bold text-emerald-700 font-mono">
                  R$ {myCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <select
                value={commissionPct}
                onChange={(e) => setCommissionPct(Number(e.target.value))}
                className="h-8 px-2 text-xs bg-white border border-emerald-300 rounded-lg text-emerald-900 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                title="Ajustar taxa de comissão"
              >
                <option value={5}>5%</option>
                <option value={10}>10% (Padrão)</option>
                <option value={15}>15%</option>
                <option value={20}>20%</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Checklist Diário do Vendedor ("Rotina Comercial 100%") (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <ListTodo className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Rotina Comercial Diária
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    4 passos para bater as metas de hoje
                  </span>
                </div>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  checklistPct === 100
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {checklistPct}% Concluído
              </span>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2 text-xs">
              <label
                onClick={() => toggleChecklistItem('followupDone')}
                className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                  dailyChecklist.followupDone
                    ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 line-through text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={dailyChecklist.followupDone}
                  readOnly
                  className="mt-0.5 rounded text-blue-600"
                />
                <span className="text-xs font-medium">
                  1. Enviar follow-up para leads sem resposta (&gt;48h)
                </span>
              </label>

              <label
                onClick={() => toggleChecklistItem('appointmentsDone')}
                className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                  dailyChecklist.appointmentsDone
                    ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 line-through text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={dailyChecklist.appointmentsDone}
                  readOnly
                  className="mt-0.5 rounded text-blue-600"
                />
                <span className="text-xs font-medium">
                  2. Atender retornos e reuniões marcadas para hoje
                </span>
              </label>

              <label
                onClick={() => toggleChecklistItem('newProposalsDone')}
                className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                  dailyChecklist.newProposalsDone
                    ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 line-through text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={dailyChecklist.newProposalsDone}
                  readOnly
                  className="mt-0.5 rounded text-blue-600"
                />
                <span className="text-xs font-medium">
                  3. Disparar novas propostas comerciais pendentes
                </span>
              </label>

              <label
                onClick={() => toggleChecklistItem('crmUpdatedDone')}
                className={`flex items-start gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                  dailyChecklist.crmUpdatedDone
                    ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 line-through text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={dailyChecklist.crmUpdatedDone}
                  readOnly
                  className="mt-0.5 rounded text-blue-600"
                />
                <span className="text-xs font-medium">
                  4. Atualizar status e notas dos contatos no funil
                </span>
              </label>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Rotina reinicia automaticamente a cada dia útil.</span>
            <button
              type="button"
              onClick={() => onNavigateTab('calendar')}
              className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
            >
              <span>Minha Agenda</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* New Notice Modal (Gestora Evelyn) */}
      {showNewNoticeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm"
          onClick={() => setShowNewNoticeModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Publicar Comunicado para a Equipe</h3>
              <button
                type="button"
                onClick={() => setShowNewNoticeModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateNotice} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Título do Comunicado:</label>
                <input
                  type="text"
                  value={newNoticeTitle}
                  onChange={(e) => setNewNoticeTitle(e.target.value)}
                  placeholder="Ex: 'Campanha Especial Semana das Mães - 20% off'"
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Mensagem / Diretriz:</label>
                <textarea
                  value={newNoticeMsg}
                  onChange={(e) => setNewNoticeMsg(e.target.value)}
                  placeholder="Instruções claras para a equipe de vendas..."
                  rows={4}
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewNoticeModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                >
                  Publicar Aviso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
