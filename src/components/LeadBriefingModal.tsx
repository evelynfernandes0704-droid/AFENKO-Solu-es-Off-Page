import React from 'react';
import {
  X,
  Phone,
  Send,
  Calendar,
  History,
  Building2,
  MapPin,
  Globe,
  Sparkles,
  Award,
  DollarSign,
  UserCheck,
  AlertCircle,
  Clock,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import {
  Lead,
  WEBSITE_STATUS_META,
  FUNNEL_STAGE_META,
  calculateLeadScore,
  getLeadFollowUpAlert,
} from '../types';

interface LeadBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onOpenScheduleAppointment?: (lead: Lead) => void;
  onOpenLeadHistory?: (lead: Lead) => void;
  onOpenPlaybook?: (lead: Lead) => void;
  onQuickDispatch?: (lead: Lead, channel: 'whatsapp') => void;
  onOpenLostModal?: (lead: Lead) => void;
  onUpdateStage?: (leadId: string, stage: Lead['funnelStage']) => void;
}

export const LeadBriefingModal: React.FC<LeadBriefingModalProps> = ({
  isOpen,
  onClose,
  lead,
  onOpenScheduleAppointment,
  onOpenLeadHistory,
  onOpenPlaybook,
  onQuickDispatch,
  onOpenLostModal,
  onUpdateStage,
}) => {
  if (!isOpen || !lead) return null;

  const scoreInfo = calculateLeadScore(lead);
  const followUpAlert = getLeadFollowUpAlert(lead);
  const cleanPhone = (lead.phone || '').replace(/\D/g, '');
  const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
  const waUrl = cleanPhone
    ? `https://wa.me/${finalPhone}?text=${encodeURIComponent(
        lead.proposalWhatsapp ||
          `Olá ${
            lead.responsibleName || lead.companyName
          }, tudo bem? Aqui é da equipe comercial de Evelyn Fernandes na Afenko — Soluções Off-Page.`
      )}`
    : '';

  // Generate tailored opening hook
  const getOpeningPitch = () => {
    const nome = lead.responsibleName || lead.companyName;
    if (lead.websiteStatus === 'no_website') {
      return `"${nome}, analisei sua presença no Google Maps em ${
        lead.city || 'sua região'
      } e vi que sua empresa não possui site oficial vinculado ao mapa. Clientes que procuram por ${
        lead.niche
      } acabam clicando nos concorrentes ao redor. Desenvolvemos uma estrutura Off-Page completa para colocar você como primeira escolha imediata."`;
    }
    if (lead.websiteStatus === 'social_only') {
      return `"${nome}, notei que o link do seu perfil no Google Maps cai direto numa rede social. Isso dispersa mais de 60% dos pacientes/clientes que estão prontos para comprar pelo celular. Preparamos uma página de alta velocidade com botão direto para sua recepção."`;
    }
    return `"${nome}, identificamos que a ${lead.companyName} tem excelente reputação no Google Maps, mas pode dobrar os contatos vindos de buscas móveis com nossa aceleração Off-Page e SEO local."`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                  Ficha Pré-Ligação / Briefing Rápido
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${scoreInfo.tierBadgeClass}`}
                >
                  Score: {scoreInfo.score} pts · {scoreInfo.tierLabel}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5 truncate max-w-md">
                {lead.companyName}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Follow-up Warning Banner if Stagnant */}
          {followUpAlert && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Atenção ao Follow-up:</strong> Lead parado há{' '}
                  {followUpAlert.daysStagnant} dias em "
                  {FUNNEL_STAGE_META[lead.funnelStage]?.shortLabel}". {followUpAlert.suggestedAction}
                </span>
              </div>
            </div>
          )}

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">
                Estágio do Funil
              </span>
              <span className="font-bold text-slate-900 text-sm block mt-0.5">
                {FUNNEL_STAGE_META[lead.funnelStage]?.shortLabel || 'Extraído'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">
                Valor da Proposta
              </span>
              <span className="font-bold text-emerald-700 font-mono text-sm block mt-0.5">
                R$ {(lead.proposalValue || 1490).toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">
                Diagnóstico Digital
              </span>
              <span
                className={`font-semibold text-xs block mt-0.5 ${
                  WEBSITE_STATUS_META[lead.websiteStatus]?.colorClass
                }`}
              >
                {WEBSITE_STATUS_META[lead.websiteStatus]?.label}
              </span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">
                Avaliação Google Maps
              </span>
              <span className="font-bold text-slate-900 text-sm block mt-0.5">
                {lead.rating ? `★ ${lead.rating.toFixed(1)} (${lead.userRatingCount || 0})` : 'Sem nota'}
              </span>
            </div>
          </div>

          {/* Contact & Decision Maker Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Dados Cadastrais & Contato com Decisor</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Sócio / Responsável:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {lead.responsibleName || 'Não identificado (chamar secretaria)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Telefone / WhatsApp:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-slate-900">
                    {lead.phone || 'Sem telefone'}
                  </span>
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone.replace(/\D/g, '')}`}
                      className="px-2 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Ligar</span>
                    </a>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">CNPJ Registrado:</span>
                <span className="font-mono text-slate-800">
                  {lead.cnpj || 'Consulta pendente na Receita Federal'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Localização:</span>
                <span className="text-slate-800">
                  {lead.city || 'Localidade no Maps'} — {lead.address || 'Endereço'}
                </span>
              </div>
            </div>
          </div>

          {/* Tailored Opening Pitch Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Gancho Sugerido de Abertura (Para usar ao falar)</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(getOpeningPitch());
                  alert('Gancho de abertura copiado!');
                }}
                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline"
              >
                Copiar Gancho
              </button>
            </div>
            <p className="text-xs sm:text-sm text-blue-950 font-medium italic leading-relaxed bg-white/70 p-3 rounded-lg border border-blue-100">
              {getOpeningPitch()}
            </p>
          </div>

          {/* Proposal Preview if generated */}
          {lead.proposalWhatsapp && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider">
                  Última Proposta Gerada (WhatsApp)
                </span>
                <span className="text-slate-400 font-mono text-[10px]">
                  R$ {(lead.proposalValue || 1490).toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 whitespace-pre-line max-h-36 overflow-y-auto font-sans leading-relaxed">
                {lead.proposalWhatsapp}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Toolbar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onQuickDispatch && onQuickDispatch(lead, 'whatsapp')}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Chamar no WhatsApp</span>
              </a>
            )}

            {onOpenScheduleAppointment && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenScheduleAppointment(lead);
                }}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>Agendar Retorno</span>
              </button>
            )}

            {onOpenPlaybook && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPlaybook(lead);
                }}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 font-semibold border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                <span>Ver Scripts / Objeções</span>
              </button>
            )}

            {onOpenLeadHistory && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLeadHistory(lead);
                }}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Histórico</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {lead.funnelStage !== 'fechado' && onUpdateStage && (
              <button
                type="button"
                onClick={() => {
                  onUpdateStage(lead.id, 'fechado');
                  onClose();
                }}
                className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-xl flex items-center gap-1 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Fechar Contrato!</span>
              </button>
            )}

            {lead.funnelStage !== 'perdido' && onOpenLostModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLostModal(lead);
                }}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl border border-rose-200 transition-colors"
              >
                Marcar como Perdido
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
