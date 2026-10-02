import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Plus,
  Send,
  MessageSquare,
  Sparkles,
  FileSearch,
  CheckCircle2,
  Calendar,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import {
  Lead,
  LeadActivity,
  calculateLeadScore,
  formatWhatsAppDeepLink,
} from '../types';
import { fetchLeadActivities, recordLeadActivityInDb } from '../firebase';

interface LeadHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  currentUserName: string;
  onOpenScheduleAppointment?: (lead: Lead) => void;
  onQuickDispatch?: (lead: Lead, channel: 'whatsapp' | 'email') => void;
}

export const LeadHistoryModal: React.FC<LeadHistoryModalProps> = ({
  isOpen,
  onClose,
  lead,
  currentUserName,
  onOpenScheduleAppointment,
  onQuickDispatch,
}) => {
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [newNote, setNewNote] = useState<string>('');
  const [savingNote, setSavingNote] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !lead) return;
    setLoading(true);
    fetchLeadActivities(lead.id)
      .then((data) => {
        // Build auto synthetic activities if empty
        if (data.length === 0) {
          const autoLogs: LeadActivity[] = [];
          if (lead.createdAt) {
            autoLogs.push({
              id: `init_${lead.id}`,
              leadId: lead.id,
              type: 'creation',
              title: 'Empresa Mapeada no Radar Maps',
              description: `Negócio identificado no Google Maps em ${lead.address}. Classificado como ${lead.websiteStatus}.`,
              authorName: lead.assignedToName || 'Sistema Afenko',
              timestamp: lead.createdAt,
            });
          }
          if (lead.cnpj) {
            autoLogs.push({
              id: `cnpj_${lead.id}`,
              leadId: lead.id,
              type: 'cnpj_lookup',
              title: 'Consulta Oficial de CNPJ',
              description: `CNPJ ${lead.cnpj} consultado na base da Receita Federal. Quadro de sócios e CNAE vinculados.`,
              authorName: 'BrasilAPI',
              timestamp: lead.updatedAt || lead.createdAt,
            });
          }
          if (lead.proposalWhatsapp || lead.proposalEmailSubject) {
            autoLogs.push({
              id: `prop_${lead.id}`,
              leadId: lead.id,
              type: 'proposal_generated',
              title: 'Proposta Comercial Gerada com Bot IA',
              description: `Proposta gerada no valor de R$ ${lead.proposalValue.toLocaleString('pt-BR')} para solução Off-Page.`,
              authorName: 'Bot Groq Llama 3.3',
              timestamp: lead.updatedAt || lead.createdAt,
            });
          }
          if (lead.lastDispatchStatus === 'enviado') {
            autoLogs.push({
              id: `disp_${lead.id}`,
              leadId: lead.id,
              type: 'proposal_dispatched',
              title: `Disparo Realizado (${lead.lastDispatchChannel?.toUpperCase()})`,
              description: 'Abordagem comercial enviada ao contato da empresa.',
              authorName: lead.assignedToName || currentUserName,
              timestamp: lead.updatedAt || lead.createdAt,
            });
          }
          setActivities(autoLogs);
        } else {
          setActivities(data);
        }
      })
      .finally(() => setLoading(false));
  }, [isOpen, lead, currentUserName]);

  if (!isOpen || !lead) return null;

  const scoreInfo = calculateLeadScore(lead);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSavingNote(true);
    try {
      const created = await recordLeadActivityInDb({
        leadId: lead.id,
        type: 'note_added',
        title: 'Observação Comercial',
        description: newNote.trim(),
        authorName: currentUserName,
      });
      setActivities((prev) => [created, ...prev]);
      setNewNote('');
    } finally {
      setSavingNote(false);
    }
  };

  const getActivityIcon = (type: LeadActivity['type']) => {
    switch (type) {
      case 'creation':
        return <Clock className="w-4 h-4 text-slate-500" />;
      case 'cnpj_lookup':
        return <FileSearch className="w-4 h-4 text-blue-500" />;
      case 'proposal_generated':
        return <Sparkles className="w-4 h-4 text-indigo-500" />;
      case 'proposal_dispatched':
      case 'followup_sent':
        return <Send className="w-4 h-4 text-emerald-500" />;
      case 'stage_changed':
        return <TrendingUp className="w-4 h-4 text-purple-500" />;
      case 'note_added':
      default:
        return <MessageSquare className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${scoreInfo.tierBadgeClass}`}>
                {scoreInfo.tierLabel} ({scoreInfo.score} pts)
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500 dark:text-slate-400">{lead.niche}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500 dark:text-slate-400">
                Responsável: <strong className="text-slate-900 dark:text-slate-100">{lead.assignedToName || 'Sem atribuição'}</strong>
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {lead.companyName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {lead.address} {lead.phone ? `· Tel: ${lead.phone}` : ''} {lead.cnpj ? `· CNPJ: ${lead.cnpj}` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Shortcuts Strip */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {lead.phone && (
              <a
                href={formatWhatsAppDeepLink(
                  lead.phone,
                  `Olá ${lead.responsibleName || lead.companyName}, aqui é ${currentUserName} da Afenko — Soluções Off-Page. Gostaria de dar seguimento em nossa conversa comercial.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onQuickDispatch?.(lead, 'whatsapp')}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold flex items-center gap-1 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Conversar no WhatsApp</span>
              </a>
            )}
            {onOpenScheduleAppointment && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenScheduleAppointment(lead);
                }}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold flex items-center gap-1 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Agendar Reunião / Retorno</span>
              </button>
            )}
          </div>

          <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
            Etapa Atual: <strong className="text-blue-600 dark:text-blue-400 uppercase">{lead.funnelStage}</strong>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Lead Scoring Criteria Card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Composição do Lead Score ({scoreInfo.score}/100)
              </span>
              <span className={`text-xs px-2 py-0.5 rounded border ${scoreInfo.tierBadgeClass}`}>
                {scoreInfo.tierLabel}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {scoreInfo.breakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 text-slate-700 dark:text-slate-300"
                >
                  <span className="truncate">{item.label}</span>
                  <span className="font-mono font-bold text-emerald-600">+{item.points}</span>
                </div>
              ))}
            </div>
          </div>

          {/* New Observation Form */}
          <form onSubmit={handleAddNote} className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Registrar Nova Interação / Observação Comercial
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Ex: Falou com a secretária Maria, ligar de volta às 14h com proposta de R$ 1.490..."
                className="flex-1 h-10 px-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
              />
              <button
                type="submit"
                disabled={savingNote || !newNote.trim()}
                className="h-10 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>{savingNote ? 'Gravando...' : 'Adicionar Nota'}</span>
              </button>
            </div>
          </form>

          {/* Timeline of activities */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Histórico Cronológico de Atividades ({activities.length})
            </h3>

            {loading ? (
              <div className="space-y-3 p-4 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
            ) : activities.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                Nenhuma atividade registrada ainda para este lead.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {activities.map((act) => (
                  <div key={act.id} className="relative group">
                    {/* Timeline bullet */}
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0">
                      {getActivityIcon(act.type)}
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {act.title}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                          <span>{act.authorName}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {new Date(act.timestamp).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {act.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
