import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Users,
  AlertTriangle,
  Flame,
  Send,
  Calendar,
  Clock,
  TrendingUp,
  Award,
  ChevronRight,
  History,
  PhoneCall,
  DollarSign,
  BarChart3,
  HelpCircle,
  UserCheck,
  BookOpen,
  Archive,
} from 'lucide-react';
import {
  Lead,
  DispatchLog,
  FunnelStage,
  FUNNEL_STAGE_META,
  WEBSITE_STATUS_META,
  TEAM_EMPLOYEES,
  calculateLeadScore,
  getLeadFollowUpAlert,
  EmployeePerformance,
  formatWhatsAppDeepLink,
  LOST_REASONS,
  LostReasonKey,
} from '../types';

interface ControlPanelViewProps {
  leads: Lead[];
  dispatches: DispatchLog[];
  currentUsername?: string;
  isAdmin?: boolean;
  activeSubTab: 'funnel' | 'performance' | 'followups' | 'dispatches';
  setActiveSubTab: (tab: 'funnel' | 'performance' | 'followups' | 'dispatches') => void;
  onUpdateLead: (leadId: string, updates: Partial<Lead>) => Promise<void>;
  onUpdateDispatchStatus: (
    dispatchId: string,
    status: DispatchLog['status']
  ) => Promise<void>;
  onOpenProposalModal: (lead: Lead) => void;
  onBatchGenerateProposals: () => Promise<void>;
  batchGenerating: boolean;
  onDistributeLeadsToTeam?: () => Promise<void>;
  onOpenLeadHistory?: (lead: Lead) => void;
  onOpenScheduleAppointment?: (lead: Lead) => void;
  onQuickDispatch?: (lead: Lead, channel: 'whatsapp' | 'email') => void;
  onOpenBriefing?: (lead: Lead) => void;
  onOpenLostModal?: (lead: Lead) => void;
  onOpenPlaybook?: (lead: Lead) => void;
}

const KANBAN_STAGES: FunnelStage[] = [
  'extraido',
  'enriquecido',
  'proposta_gerada',
  'proposta_enviada',
  'em_negociacao',
  'fechado',
];

export const ControlPanelView: React.FC<ControlPanelViewProps> = ({
  leads,
  dispatches,
  currentUsername = 'vendas',
  isAdmin = true,
  activeSubTab,
  setActiveSubTab,
  onUpdateLead,
  onUpdateDispatchStatus,
  onOpenProposalModal,
  onBatchGenerateProposals,
  batchGenerating,
  onDistributeLeadsToTeam,
  onOpenLeadHistory,
  onOpenScheduleAppointment,
  onQuickDispatch,
  onOpenBriefing,
  onOpenLostModal,
  onOpenPlaybook,
}) => {
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>(
    isAdmin ? 'all' : currentUsername
  );
  const [sortByScore, setSortByScore] = useState<boolean>(true);

  useEffect(() => {
    setEmployeeFilter(isAdmin ? 'all' : currentUsername);
  }, [isAdmin, currentUsername]);

  // Lead filtering
  const visibleLeads = leads.filter((l) => {
    if (!isAdmin) return l.assignedTo === currentUsername;
    if (employeeFilter === 'all') return true;
    if (employeeFilter === 'unassigned') return !l.assignedTo;
    return l.assignedTo === employeeFilter;
  });

  // Calculate follow-up alerts
  const followUpAlerts = visibleLeads
    .map((l) => getLeadFollowUpAlert(l))
    .filter((a): a is NonNullable<typeof a> => a !== null)
    .sort((a, b) => b.daysStagnant - a.daysStagnant);

  const criticalFollowupsCount = followUpAlerts.filter((a) => a.urgency === 'critica').length;

  // Pipeline metrics
  const totalPipelineValue = visibleLeads
    .filter((l) => l.funnelStage !== 'perdido')
    .reduce((acc, l) => acc + (Number(l.proposalValue) || 0), 0);

  const closedValue = visibleLeads
    .filter((l) => l.funnelStage === 'fechado')
    .reduce((acc, l) => acc + (Number(l.proposalValue) || 0), 0);

  const closedDealsCount = visibleLeads.filter((l) => l.funnelStage === 'fechado').length;
  const sentProposalsCount = visibleLeads.filter(
    (l) => l.funnelStage === 'proposta_enviada' || l.funnelStage === 'em_negociacao' || l.funnelStage === 'fechado'
  ).length;

  const overallConversionRate = sentProposalsCount > 0
    ? Math.round((closedDealsCount / sentProposalsCount) * 100)
    : 0;

  // Employee Performance Calculations
  const employeePerformances: EmployeePerformance[] = TEAM_EMPLOYEES.map((emp) => {
    const empLeads = leads.filter((l) => l.assignedTo === emp.username);
    const proposalsGen = empLeads.filter((l) => Boolean(l.proposalWhatsapp)).length;
    const proposalsSent = empLeads.filter(
      (l) => l.funnelStage === 'proposta_enviada' || l.funnelStage === 'em_negociacao' || l.funnelStage === 'fechado'
    ).length;
    const inNeg = empLeads.filter((l) => l.funnelStage === 'em_negociacao').length;
    const closed = empLeads.filter((l) => l.funnelStage === 'fechado').length;
    const lost = empLeads.filter((l) => l.funnelStage === 'perdido').length;
    const revenue = empLeads
      .filter((l) => l.funnelStage === 'fechado')
      .reduce((acc, l) => acc + (Number(l.proposalValue) || 0), 0);
    const convRate = proposalsSent > 0 ? Math.round((closed / proposalsSent) * 100) : 0;
    const pendingFu = empLeads
      .map((l) => getLeadFollowUpAlert(l))
      .filter((a) => a !== null).length;

    const attentionNotes: string[] = [];
    if (empLeads.length > 0 && proposalsGen === 0) {
      attentionNotes.push('Gargalo: Nenhum lead gerou proposta ainda.');
    }
    if (pendingFu >= 2) {
      attentionNotes.push(`Atenção: ${pendingFu} contatos parados há mais de 2 dias precisando de follow-up.`);
    }
    if (proposalsSent >= 3 && closed === 0) {
      attentionNotes.push('Taxa de fechamento baixa: verificar quebra de objeções no WhatsApp.');
    }
    if (inNeg >= 2) {
      attentionNotes.push('Oportunidade: Várias negociações ativas, focar em fechar contrato com bônus.');
    }

    return {
      username: emp.username,
      displayName: emp.displayName,
      totalAssigned: empLeads.length,
      proposalsGenerated: proposalsGen,
      proposalsSent,
      inNegotiation: inNeg,
      closedDeals: closed,
      lostDeals: lost,
      totalRevenue: revenue,
      conversionRate: convRate,
      pendingFollowups: pendingFu,
      attentionNotes,
    };
  });

  const filteredDispatches = dispatches.filter((d) => {
    if (!isAdmin) return false;
    if (channelFilter !== 'all' && d.channel !== channelFilter) return false;
    if (statusFilter !== 'all' && d.status !== statusFilter) return false;
    if (employeeFilter !== 'all' && employeeFilter !== 'unassigned') {
      const matchingLead = leads.find((l) => l.id === d.leadId);
      const ownerMatch =
        d.dispatchedBy === employeeFilter ||
        matchingLead?.assignedTo === employeeFilter;
      if (!ownerMatch) return false;
    }
    return true;
  });

  const advanceStage = (current: FunnelStage): FunnelStage => {
    const idx = KANBAN_STAGES.indexOf(current);
    if (idx >= 0 && idx < KANBAN_STAGES.length - 1) {
      return KANBAN_STAGES[idx + 1];
    }
    return 'fechado';
  };

  return (
    <div className="space-y-6">
      {/* Follow-up Alerts Header Banner (Shows when stagnant leads exist) */}
      {followUpAlerts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2">
                <span>{followUpAlerts.length} Oportunidades Precisando de Follow-up</span>
                {criticalFollowupsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                    {criticalFollowupsCount} Críticos (4+ dias)
                  </span>
                )}
              </h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                O sistema identificou clientes parados sem resposta. Retome o contato para evitar perder a venda.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveSubTab('followups')}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0"
          >
            <span>Ver Central de Follow-up ({followUpAlerts.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubTab('funnel')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
              activeSubTab === 'funnel'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Funil de Vendas (Kanban)</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveSubTab('performance')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
                activeSubTab === 'performance'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Desempenho da Equipe & Metas</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveSubTab('followups')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 relative ${
              activeSubTab === 'followups'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Central de Follow-up</span>
            {followUpAlerts.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveSubTab('dispatches')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 ${
                activeSubTab === 'dispatches'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Monitor de Envios ({dispatches.length})</span>
            </button>
          )}
        </div>

        {/* Lead Scoring Sorting Toggle in Kanban */}
        {activeSubTab === 'funnel' && (
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Ordenar:</span>
            <button
              type="button"
              onClick={() => setSortByScore(!sortByScore)}
              className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                sortByScore
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              ⭐ Maior Lead Score
            </button>
          </div>
        )}
      </div>

      {/* SUB-VIEW 1: FUNIL DE VENDAS KANBAN */}
      {activeSubTab === 'funnel' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Total de Leads</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums mt-1 block">
                  {visibleLeads.length}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Pipeline ativo
                </span>
              </div>

              <div className="pt-3 lg:pt-0 lg:pl-6">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Propostas Enviadas</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono tabular-nums mt-1 block">
                  {sentProposalsCount}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Abordagens realizadas
                </span>
              </div>

              <div className="pt-3 lg:pt-0 lg:pl-6">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Contratos Fechados</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-1 block">
                  {closedDealsCount}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Taxa conv: <strong className="text-emerald-600">{overallConversionRate}%</strong>
                </span>
              </div>

              <div className="pt-3 lg:pt-0 lg:pl-6">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Em Negociação</span>
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono tabular-nums mt-1 block">
                  {visibleLeads.filter((l) => l.funnelStage === 'em_negociacao').length}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Contatos aquecidos
                </span>
              </div>

              <div className="pt-3 lg:pt-0 lg:pl-6">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Faturamento Fechado</span>
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 font-mono tabular-nums mt-1 block">
                  {closedValue.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    maximumFractionDigits: 0,
                  })}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                  Receita gerada
                </span>
              </div>
            </div>
          </div>

          {/* Kanban Board Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
            {KANBAN_STAGES.map((stage) => {
              let stageLeads = visibleLeads.filter((l) => l.funnelStage === stage);

              if (sortByScore) {
                stageLeads = [...stageLeads].sort(
                  (a, b) => calculateLeadScore(b).score - calculateLeadScore(a).score
                );
              }

              const stageValue = stageLeads.reduce(
                (acc, l) => acc + (Number(l.proposalValue) || 0),
                0
              );
              const meta = FUNNEL_STAGE_META[stage];

              return (
                <div
                  key={stage}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col min-h-[480px]"
                >
                  {/* Column Header */}
                  <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {meta.shortLabel}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {stageValue.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center font-mono">
                      {stageLeads.length}
                    </span>
                  </div>

                  {/* Cards Pool */}
                  <div className="p-2 space-y-2.5 flex-1 overflow-y-auto max-h-[640px]">
                    {stageLeads.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-600 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl my-2">
                        Nenhum lead nesta etapa
                      </div>
                    ) : (
                      stageLeads.map((lead) => {
                        const score = calculateLeadScore(lead);
                        const followUpAlert = getLeadFollowUpAlert(lead);

                        return (
                          <div
                            key={lead.id}
                            className="p-3.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xs space-y-2.5 transition-all hover:border-blue-500"
                          >
                            {/* Scoring & Stagnant Badge */}
                            <div className="flex items-center justify-between gap-1 text-[11px]">
                              <span
                                className={`px-2 py-0.5 rounded border font-semibold ${score.tierBadgeClass}`}
                                title={score.breakdown.map((b) => b.label).join('\n')}
                              >
                                {score.score} pts · {score.tierLabel}
                              </span>

                              {followUpAlert && (
                                <span
                                  className="px-1.5 py-0.5 rounded bg-amber-500 text-white font-bold text-[10px] animate-pulse flex items-center gap-0.5"
                                  title={followUpAlert.reason}
                                >
                                  <Clock className="w-3 h-3" />
                                  {followUpAlert.daysStagnant}d
                                </span>
                              )}
                            </div>

                            {/* Lead details */}
                            <div>
                              <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {lead.companyName}
                              </h5>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {lead.niche} {lead.address ? `· ${lead.address.split(',')[0]}` : ''}
                              </p>
                              {lead.phone && (
                                <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                                  {lead.phone}
                                </p>
                              )}
                            </div>

                            {/* Follow-up warning chip */}
                            {followUpAlert && (
                              <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200">
                                <strong>Follow-up pendente:</strong> {followUpAlert.reason}
                              </div>
                            )}

                            {/* Value and Owner */}
                            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-700">
                              <span className="font-bold text-slate-900 dark:text-white font-mono">
                                R$ {lead.proposalValue.toLocaleString('pt-BR')}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[90px]">
                                {lead.assignedToName || 'Gestora'}
                              </span>
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="pt-1 flex items-center justify-between gap-1 text-xs">
                              <div className="flex items-center gap-1">
                                {onOpenBriefing && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenBriefing(lead)}
                                    className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-slate-700 rounded"
                                    title="Ficha Pré-Ligação (Briefing Rápido)"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {onOpenPlaybook && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenPlaybook(lead)}
                                    className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 dark:hover:bg-slate-700 rounded"
                                    title="Playbook & Quebra de Objeções"
                                  >
                                    <BookOpen className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {onOpenLeadHistory && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenLeadHistory(lead)}
                                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                                    title="Ver Histórico Completo & Notas"
                                  >
                                    <History className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {onOpenScheduleAppointment && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenScheduleAppointment(lead)}
                                    className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 rounded"
                                    title="Agendar Reunião ou Retorno"
                                  >
                                    <Calendar className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {onOpenLostModal && stage !== 'fechado' && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenLostModal(lead)}
                                    className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded"
                                    title="Registrar Motivo de Perda / Arquivar"
                                  >
                                    <Archive className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {stage !== 'fechado' && (
                                <button
                                  type="button"
                                  onClick={() => onUpdateLead(lead.id, { funnelStage: advanceStage(stage) })}
                                  className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-blue-600 hover:text-white rounded text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 transition-colors"
                                  title="Avançar etapa no funil"
                                >
                                  <span>Avançar</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: PAINEL DE DESEMPENHO DA EQUIPE (EXCLUSIVO GESTORA) */}
      {activeSubTab === 'performance' && isAdmin && (
        <div className="space-y-6">
          {/* Header Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  Indicadores de Desempenho & Metas Comerciais
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  Produtividade & Conversão por Funcionário
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Acompanhe em tempo real quem está convertendo mais propostas e identifique pontos que precisam de atenção.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-center">
                  <div className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                    Taxa Geral de Conversão
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {overallConversionRate}%
                  </div>
                </div>

                <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 rounded-xl text-center">
                  <div className="text-[11px] text-blue-800 dark:text-blue-300 font-semibold">
                    Total Faturado Equipe
                  </div>
                  <div className="text-xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                    {closedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Employee Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
              {employeePerformances.map((perf, index) => (
                <div
                  key={perf.username}
                  className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-4"
                >
                  {/* Card Header with Rank Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                        0{index + 1}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {perf.displayName}
                        </h4>
                        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                          Login: {perf.username}
                        </span>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-mono">
                      {perf.conversionRate}% Conv.
                    </span>
                  </div>

                  {/* Key Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Leads</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {perf.totalAssigned}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Enviadas</span>
                      <span className="text-base font-bold text-blue-600 font-mono mt-0.5 block">
                        {perf.proposalsSent}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Fechadas</span>
                      <span className="text-base font-bold text-emerald-600 font-mono mt-0.5 block">
                        {perf.closedDeals}
                      </span>
                    </div>
                  </div>

                  {/* Revenue pill */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Faturamento Fechado:</span>
                    <strong className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {perf.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                    </strong>
                  </div>

                  {/* Attention points / AI Diagnosis for Manager */}
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                      Diagnóstico da Gestão
                    </span>
                    {perf.attentionNotes.length === 0 ? (
                      <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300">
                        ✓ Desempenho equilibrado. Leads atualizados e sem gargalos graves.
                      </div>
                    ) : (
                      perf.attentionNotes.map((note, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200"
                        >
                          {note}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Loss Analysis Card for Management */}
            {(() => {
              const lostLeads = leads.filter((l) => l.funnelStage === 'perdido');
              const reasonsCount: Record<string, number> = {};
              lostLeads.forEach((l) => {
                const r = l.lostReason || 'outro';
                reasonsCount[r] = (reasonsCount[r] || 0) + 1;
              });

              return (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                        Inteligência Comercial
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        Diagnóstico de Motivos de Perda & Objeções da Equipe
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Total de {lostLeads.length} negócios perdidos catalogados pela equipe.
                      </p>
                    </div>

                    <span className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                      {lostLeads.length === 0 ? 'Nenhum lead perdido' : `${lostLeads.length} registros`}
                    </span>
                  </div>

                  {lostLeads.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                      Nenhum lead registrado como perdido ainda. Conforme a equipe indicar motivos de perda, os gargalos aparecerão aqui.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {(Object.entries(LOST_REASONS) as [LostReasonKey, { label: string; desc: string }][]).map(
                        ([key, meta]) => {
                          const count = reasonsCount[key] || 0;
                          const pct = lostLeads.length > 0 ? Math.round((count / lostLeads.length) * 100) : 0;
                          return (
                            <div
                              key={key}
                              className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate pr-1">
                                  {meta.label}
                                </span>
                                <span className="font-mono font-bold text-rose-600 text-xs shrink-0">
                                  {count} ({pct}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-rose-500 h-full rounded-full transition-all"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                                {meta.desc}
                              </span>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: CENTRAL INTELIGENTE DE FOLLOW-UP */}
      {activeSubTab === 'followups' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                  Recuperação de Vendas
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  Central Inteligente de Follow-up
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Clientes que receberam propostas ou iniciaram negociação e estão há mais de 48h sem retorno.
                </p>
              </div>

              <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                {followUpAlerts.length} contatos aguardando retomada
              </div>
            </div>

            {followUpAlerts.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Tudo em dia! Nenhum lead estagnado no momento.
                </h4>
                <p>Todos os contatos foram contatados recentemente ou já foram finalizados.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {followUpAlerts.map((alert) => {
                  const lead = alert.lead;
                  const waUrl = formatWhatsAppDeepLink(
                    lead.phone || '',
                    `Olá ${lead.responsibleName || lead.companyName}, tudo bem? Aqui é ${lead.assignedToName || 'da equipe Afenko'}. Conseguiu avaliar a proposta comercial de Landing Page Off-Page que enviamos? Posso esclarecer qualquer dúvida ou apresentar uma condição especial para fecharmos esta semana!`
                  );

                  return (
                    <div
                      key={alert.leadId}
                      className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                              alert.urgency === 'critica'
                                ? 'bg-rose-600 text-white'
                                : 'bg-amber-600 text-white'
                            }`}
                          >
                            {alert.urgency === 'critica' ? 'Crítico (4+ dias)' : 'Atenção (2+ dias)'}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {lead.companyName}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 dark:text-slate-400">{lead.niche}</span>
                          <span className="text-slate-400">·</span>
                          <span className="font-mono text-slate-600 dark:text-slate-300">
                            Resp: {lead.assignedToName || 'Gestora'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          <strong>Motivo:</strong> {alert.reason}.
                        </p>

                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                          <strong>Ação Recomendada:</strong> {alert.suggestedAction}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {lead.phone && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => onQuickDispatch?.(lead, 'whatsapp')}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Reaquecer no WhatsApp</span>
                          </a>
                        )}

                        {onOpenScheduleAppointment && (
                          <button
                            type="button"
                            onClick={() => onOpenScheduleAppointment(lead)}
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Agendar Retorno</span>
                          </button>
                        )}

                        {onOpenLeadHistory && (
                          <button
                            type="button"
                            onClick={() => onOpenLeadHistory(lead)}
                            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
                          >
                            Histórico
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: MONITOR DE ENVIOS (ORIGINAL) */}
      {activeSubTab === 'dispatches' && isAdmin && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Histórico & Logs de Envios
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acompanhe o status técnico e a data de todos os envios realizados pela equipe.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              >
                <option value="all">Todos os Canais</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">E-mail</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              >
                <option value="all">Todos os Status</option>
                <option value="enviado">Enviado</option>
                <option value="respondido">Respondido</option>
                <option value="erro">Erro</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredDispatches.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Nenhum envio registrado para este filtro.
              </div>
            ) : (
              filteredDispatches.map((disp) => (
                <div key={disp.id} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">{disp.companyName}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-mono uppercase text-blue-600">{disp.channel}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500 font-mono">
                        {new Date(disp.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 max-w-xl">
                      {disp.messagePreview}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={disp.status}
                      onChange={(e) => onUpdateDispatchStatus(disp.id, e.target.value as any)}
                      className="h-8 px-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      <option value="enviado">Enviado</option>
                      <option value="entregue">Entregue</option>
                      <option value="visualizado">Visualizado</option>
                      <option value="respondido">Respondido</option>
                      <option value="erro">Erro</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
