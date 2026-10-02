import React, { useState, useEffect } from 'react';
import {
  Download,
  Copy,
  Check,
  Search,
  Sparkles,
  FileSearch,
  Send,
  Mail,
  Trash2,
  Plus,
  Users,
  History,
  Calendar,
  AlertTriangle,
  Clock,
  UserCheck,
  BookOpen,
} from 'lucide-react';
import {
  Lead,
  FunnelStage,
  FUNNEL_STAGE_META,
  WEBSITE_STATUS_META,
  TEAM_EMPLOYEES,
  calculateLeadScore,
  getLeadFollowUpAlert,
  LOST_REASONS,
  LostReasonKey,
} from '../types';
import {
  formatWhatsAppDeepLink,
  formatMailtoDeepLink,
} from './ProposalBotModal';

interface SpreadsheetViewProps {
  leads: Lead[];
  currentUsername?: string;
  isAdmin?: boolean;
  onUpdateLead: (leadId: string, updates: Partial<Lead>) => Promise<void>;
  onDeleteLead: (leadId: string) => Promise<void>;
  onOpenProposalModal: (lead: Lead) => void;
  onOpenCnpjModal: (lead: Lead) => void;
  onOpenNewLeadModal: () => void;
  onQuickDispatch: (lead: Lead, channel: 'whatsapp' | 'email') => Promise<void>;
  onDistributeLeadsToTeam?: () => Promise<void>;
  onOpenLeadHistory?: (lead: Lead) => void;
  onOpenScheduleAppointment?: (lead: Lead) => void;
  onOpenBriefing?: (lead: Lead) => void;
  onOpenLostModal?: (lead: Lead) => void;
  onOpenPlaybook?: (lead: Lead) => void;
}

export const SpreadsheetView: React.FC<SpreadsheetViewProps> = ({
  leads,
  currentUsername = 'vendas',
  isAdmin = true,
  onUpdateLead,
  onDeleteLead,
  onOpenProposalModal,
  onOpenCnpjModal,
  onOpenNewLeadModal,
  onQuickDispatch,
  onDistributeLeadsToTeam,
  onOpenLeadHistory,
  onOpenScheduleAppointment,
  onOpenBriefing,
  onOpenLostModal,
  onOpenPlaybook,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>(
    isAdmin ? 'all' : currentUsername
  );
  const [copiedTsv, setCopiedTsv] = useState<boolean>(false);

  useEffect(() => {
    setEmployeeFilter(isAdmin ? 'all' : currentUsername);
  }, [isAdmin, currentUsername]);

  const filteredLeads = leads.filter((lead) => {
    if (!isAdmin && lead.assignedTo !== currentUsername) return false;
    if (stageFilter !== 'all' && lead.funnelStage !== stageFilter) return false;
    if (siteFilter === 'opportunity') {
      if (lead.websiteStatus === 'active_website') return false;
    } else if (siteFilter !== 'all' && lead.websiteStatus !== siteFilter) {
      return false;
    }

    if (isAdmin) {
      if (employeeFilter === 'unassigned') {
        if (lead.assignedTo && lead.assignedTo.trim() !== '') return false;
      } else if (employeeFilter !== 'all') {
        if (lead.assignedTo !== employeeFilter) return false;
      }
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      lead.companyName.toLowerCase().includes(q) ||
      (lead.cnpj || '').toLowerCase().includes(q) ||
      lead.niche.toLowerCase().includes(q) ||
      (lead.responsibleName || '').toLowerCase().includes(q) ||
      (lead.assignedTo || '').toLowerCase().includes(q) ||
      (lead.assignedToName || '').toLowerCase().includes(q) ||
      lead.address.toLowerCase().includes(q) ||
      (lead.phone || '').toLowerCase().includes(q)
    );
  });

  const handleExportCsv = () => {
    const headers = [
      'Empresa',
      'Nome Fantasia',
      'Funcionario Designado',
      'CNPJ',
      'Nicho / CNAE',
      'Responsavel / Socio',
      'Telefone / WhatsApp',
      'E-mail',
      'Status do Site',
      'URL Atual',
      'Avaliacao Maps',
      'Etapa do Funil',
      'Valor Proposta (R$)',
      'Ultimo Canal Envio',
      'Status Envio',
      'Endereco Completo',
      'Proposta WhatsApp Gerada',
    ];

    const escapeCsv = (val: any) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredLeads.map((l) => [
      escapeCsv(l.companyName),
      escapeCsv(l.tradeName || l.companyName),
      escapeCsv(l.assignedToName || l.assignedTo || 'Gestora (vendas)'),
      escapeCsv(l.cnpj || ''),
      escapeCsv(l.niche),
      escapeCsv(l.responsibleName || ''),
      escapeCsv(l.phone || ''),
      escapeCsv(l.email || ''),
      escapeCsv(WEBSITE_STATUS_META[l.websiteStatus]?.label || l.websiteStatus),
      escapeCsv(l.websiteUrl || ''),
      escapeCsv(l.rating || 0),
      escapeCsv(FUNNEL_STAGE_META[l.funnelStage]?.shortLabel || l.funnelStage),
      escapeCsv(l.proposalValue || 0),
      escapeCsv(l.lastDispatchChannel || 'none'),
      escapeCsv(l.lastDispatchStatus || 'pendente'),
      escapeCsv(l.address),
      escapeCsv(l.proposalWhatsapp || ''),
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `planilha_leads_offpage_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyForGoogleSheets = () => {
    const headers = [
      'Empresa',
      'Funcionário Responsável',
      'CNPJ',
      'Nicho',
      'Responsável',
      'WhatsApp',
      'E-mail',
      'Status Site',
      'Etapa Funil',
      'Valor Proposta',
      'Endereço',
    ];

    const rows = filteredLeads.map((l) =>
      [
        l.companyName,
        l.assignedToName || l.assignedTo || 'Gestora (vendas)',
        l.cnpj || '',
        l.niche,
        l.responsibleName || '',
        l.phone || '',
        l.email || '',
        WEBSITE_STATUS_META[l.websiteStatus]?.label || '',
        FUNNEL_STAGE_META[l.funnelStage]?.shortLabel || '',
        l.proposalValue,
        l.address,
      ]
        .map((cell) => String(cell ?? '').replace(/[\t\n\r]+/g, ' '))
        .join('\t')
    );

    const tsv = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(tsv);
    setCopiedTsv(true);
    setTimeout(() => setCopiedTsv(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por empresa, CNPJ, funcionário ou telefone..."
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Employee Filter (Only visible to Manager / Admin) */}
          {isAdmin && (
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="h-9 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            >
              <option value="all">
                Equipe: Todos os Contatos ({leads.length})
              </option>
              {TEAM_EMPLOYEES.map((emp) => {
                const count = leads.filter(
                  (l) => l.assignedTo === emp.username
                ).length;
                return (
                  <option key={emp.username} value={emp.username}>
                    {emp.username} — {emp.displayName} ({count} leads)
                  </option>
                );
              })}
              <option value="unassigned">
                Sem Funcionário Designado (
                {leads.filter((l) => !l.assignedTo).length})
              </option>
            </select>
          )}

          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="all">Presença Digital: Todas</option>
            <option value="opportunity">Apenas Oportunidades (Sem Site / Social)</option>
            <option value="no_website">Sem Site no Maps</option>
            <option value="social_only">Apenas Instagram / Linktree</option>
            <option value="outdated_website">Site HTTP Desatualizado</option>
          </select>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="all">Etapa do Funil: Todas ({leads.length})</option>
            {Object.entries(FUNNEL_STAGE_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isAdmin && onDistributeLeadsToTeam && leads.length > 0 && (
            <button
              type="button"
              onClick={onDistributeLeadsToTeam}
              title="Distribui automaticamente Empresa X p/ funcionário01, Empresa Y p/ funcionário02 e Empresa Z p/ funcionário03"
              className="h-9 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Distribuir p/ Funcionários (01, 02, 03)</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={onOpenNewLeadModal}
              className="h-9 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar CNPJ / Lead</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyForGoogleSheets}
            className="h-9 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            {copiedTsv ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copiado p/ Google Sheets!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar p/ Google Sheets</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="h-9 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Planilha (.CSV / Excel)</span>
          </button>
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Empresa & Nicho</th>
                <th className="py-3 px-3">
                  {isAdmin
                    ? 'Enviar p/ Funcionário (Contato)'
                    : 'Funcionário Designado'}
                </th>
                <th className="py-3 px-3">Score & Prioridade</th>
                <th className="py-3 px-3">Diagnóstico Site</th>
                <th className="py-3 px-3">CNPJ & Sócio Responsável</th>
                <th className="py-3 px-3">WhatsApp & E-mail</th>
                <th className="py-3 px-3">Etapa do Funil</th>
                <th className="py-3 px-3 text-right">Proposta (R$)</th>
                <th className="py-3 px-4 text-right">Ações & Disparo Rápido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    Nenhum contato na planilha com os filtros selecionados. Extraia
                    empresas pelo Radar Google Maps ou altere o filtro de funcionário acima.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const defaultPitch =
                    lead.proposalWhatsapp ||
                    `Olá ${
                      lead.responsibleName || lead.companyName
                    }, tudo bem? Aqui é da equipe comercial de Evelyn Fernandes. Vimos o perfil da ${
                      lead.companyName
                    } no Google Maps e preparamos uma proposta de Landing Page Off-Page exclusiva para o nicho de ${
                      lead.niche
                    }. Podemos conversar?\n\n— Equipe Comercial Evelyn Fernandes\nWhatsApp: (11) 97888-1952 | E-mail: contactevelynfernandes@gmail.com`;

                  const waLink = formatWhatsAppDeepLink(
                    lead.phone || '',
                    defaultPitch
                  );
                  const mailLink = formatMailtoDeepLink(
                    lead.email || '',
                    lead.proposalEmailSubject ||
                      `Proposta Comercial Off-Page — ${lead.companyName}`,
                    lead.proposalEmailBody || defaultPitch
                  );

                  const score = calculateLeadScore(lead);
                  const followUpAlert = getLeadFollowUpAlert(lead);

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-slate-50/90 transition-colors"
                    >
                      {/* Company & Niche */}
                      <td className="py-2.5 px-4 max-w-[220px]">
                        <div className="font-semibold text-slate-900 truncate">
                          {lead.companyName}
                        </div>
                        <div className="text-slate-500 truncate">
                          <span>{lead.niche}</span>
                          {lead.city && (
                            <>
                              <span aria-hidden="true"> · </span>
                              <span>{lead.city}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Employee Assignment Column */}
                      <td className="py-2.5 px-3 min-w-[185px]">
                        {isAdmin ? (
                          <select
                            value={lead.assignedTo || ''}
                            onChange={(e) => {
                              const selectedUser = e.target.value;
                              const empObj = TEAM_EMPLOYEES.find(
                                (emp) => emp.username === selectedUser
                              );
                              onUpdateLead(lead.id, {
                                assignedTo: selectedUser,
                                assignedToName: empObj ? empObj.displayName : '',
                              });
                            }}
                            className="w-full h-8 px-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:border-blue-600"
                          >
                            <option value="">
                              Escolher Funcionário...
                            </option>
                            {TEAM_EMPLOYEES.map((emp) => (
                              <option key={emp.username} value={emp.username}>
                                {emp.username} ({emp.displayName})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="font-mono text-xs font-semibold text-blue-700">
                            {lead.assignedToName ||
                              lead.assignedTo ||
                              'Equipe Geral'}
                          </div>
                        )}
                      </td>

                      {/* Lead Score & Prioridade */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`px-2 py-0.5 rounded border text-[11px] font-semibold inline-block ${score.tierBadgeClass}`}
                            title={score.breakdown.map((b) => b.label).join('\n')}
                          >
                            {score.score} pts · {score.tierLabel}
                          </span>
                          {followUpAlert && (
                            <span
                              className="px-1.5 py-0.5 rounded bg-amber-500 text-white font-bold text-[10px] flex items-center gap-1 max-w-fit"
                              title={followUpAlert.reason}
                            >
                              <Clock className="w-2.5 h-2.5" />
                              <span>Follow-up {followUpAlert.daysStagnant}d</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Website Diagnosis */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div
                          className={
                            WEBSITE_STATUS_META[lead.websiteStatus].colorClass
                          }
                        >
                          {WEBSITE_STATUS_META[lead.websiteStatus].label}
                        </div>
                        <div className="text-slate-400 font-mono tabular-nums">
                          {lead.rating ? `★ ${lead.rating.toFixed(1)} Maps` : 'Sem nota'}
                        </div>
                      </td>

                      {/* CNPJ & Responsible (Inline Editable) */}
                      <td className="py-2.5 px-3 min-w-[185px]">
                        <div className="flex items-center gap-1 mb-1">
                          <input
                            type="text"
                            defaultValue={lead.cnpj || ''}
                            onBlur={(e) => {
                              if (e.target.value !== (lead.cnpj || '')) {
                                onUpdateLead(lead.id, { cnpj: e.target.value });
                              }
                            }}
                            placeholder="CNPJ (clique p/ editar)"
                            className="w-36 px-1.5 py-0.5 text-xs font-mono bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-600 rounded text-slate-800 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => onOpenCnpjModal(lead)}
                            title="Consultar CNPJ na Receita Federal"
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <FileSearch className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          defaultValue={lead.responsibleName || ''}
                          onBlur={(e) => {
                            if (
                              e.target.value !== (lead.responsibleName || '')
                            ) {
                              onUpdateLead(lead.id, {
                                responsibleName: e.target.value,
                              });
                            }
                          }}
                          placeholder="Nome do Sócio / Responsável"
                          className="w-full px-1.5 py-0.5 text-xs bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-600 rounded text-slate-600 focus:outline-none"
                        />
                      </td>

                      {/* Phone & Email (Inline Editable) */}
                      <td className="py-2.5 px-3 min-w-[185px]">
                        <input
                          type="text"
                          defaultValue={lead.phone || ''}
                          onBlur={(e) => {
                            if (e.target.value !== (lead.phone || '')) {
                              onUpdateLead(lead.id, { phone: e.target.value });
                            }
                          }}
                          placeholder="WhatsApp (DDD + Número)"
                          className="w-full px-1.5 py-0.5 text-xs font-mono tabular-nums bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-600 rounded text-slate-800 focus:outline-none mb-1"
                        />
                        <input
                          type="email"
                          defaultValue={lead.email || ''}
                          onBlur={(e) => {
                            if (e.target.value !== (lead.email || '')) {
                              onUpdateLead(lead.id, { email: e.target.value });
                            }
                          }}
                          placeholder="email@empresa.com.br"
                          className="w-full px-1.5 py-0.5 text-xs font-mono bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-blue-600 rounded text-slate-600 focus:outline-none"
                        />
                      </td>

                      {/* Funnel Stage */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <select
                          value={lead.funnelStage}
                          onChange={(e) => {
                            const newStage = e.target.value as FunnelStage;
                            if (newStage === 'perdido' && onOpenLostModal) {
                              onOpenLostModal(lead);
                            } else {
                              onUpdateLead(lead.id, { funnelStage: newStage });
                            }
                          }}
                          className="h-8 px-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:border-blue-600"
                        >
                          {Object.entries(FUNNEL_STAGE_META).map(
                            ([stageKey, meta]) => (
                              <option key={stageKey} value={stageKey}>
                                {meta.shortLabel}
                              </option>
                            )
                          )}
                        </select>
                        {lead.funnelStage === 'perdido' && lead.lostReason && (
                          <div
                            className="text-[10px] text-rose-600 font-semibold truncate max-w-[130px] mt-0.5"
                            title={lead.lostNotes ? `${LOST_REASONS[lead.lostReason as LostReasonKey]?.label || lead.lostReason}: ${lead.lostNotes}` : (LOST_REASONS[lead.lostReason as LostReasonKey]?.label || lead.lostReason)}
                          >
                            {LOST_REASONS[lead.lostReason as LostReasonKey]?.label || lead.lostReason}
                          </div>
                        )}
                      </td>

                      {/* Proposal Value */}
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <input
                          type="number"
                          defaultValue={lead.proposalValue || 1490}
                          onBlur={(e) => {
                            const val = Number(e.target.value);
                            if (val !== lead.proposalValue) {
                              onUpdateLead(lead.id, { proposalValue: val });
                            }
                          }}
                          className="w-24 px-2 py-1 text-right text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                      </td>

                      {/* Actions & Direct Dispatch */}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {onOpenBriefing && (
                            <button
                              type="button"
                              onClick={() => onOpenBriefing(lead)}
                              className="p-1.5 text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                              title="Ficha Pré-Ligação / Briefing Rápido"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onOpenPlaybook && (
                            <button
                              type="button"
                              onClick={() => onOpenPlaybook(lead)}
                              className="p-1.5 text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
                              title="Playbook & Quebra de Objeções"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onOpenLeadHistory && (
                            <button
                              type="button"
                              onClick={() => onOpenLeadHistory(lead)}
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors"
                              title="Ver Histórico & Registrar Observações"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onOpenScheduleAppointment && (
                            <button
                              type="button"
                              onClick={() => onOpenScheduleAppointment(lead)}
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md transition-colors"
                              title="Agendar Retorno Comercial / Reunião"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onOpenProposalModal(lead)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md flex items-center gap-1 transition-colors"
                            title="Personalizar Proposta com Bot Groq"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Bot Proposta</span>
                          </button>

                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => onQuickDispatch(lead, 'whatsapp')}
                            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-1 transition-colors"
                            title="Enviar Proposta no WhatsApp"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>

                          <a
                            href={mailLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => onQuickDispatch(lead, 'email')}
                            className="p-1.5 text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                            title="Enviar Proposta por E-mail"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => onDeleteLead(lead.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                              title="Remover Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
