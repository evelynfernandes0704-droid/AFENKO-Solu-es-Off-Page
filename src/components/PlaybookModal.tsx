import React, { useState } from 'react';
import {
  X,
  Search,
  BookOpen,
  Copy,
  Check,
  Send,
  HelpCircle,
  Sparkles,
  Zap,
  Target,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import { SALES_PLAYBOOK, PlaybookScript } from '../data/salesPlaybook';
import { Lead } from '../types';

interface PlaybookModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLead?: Lead | null;
  onQuickDispatch?: (lead: Lead, channel: 'whatsapp') => void;
}

export const PlaybookModal: React.FC<PlaybookModalProps> = ({
  isOpen,
  onClose,
  selectedLead,
  onQuickDispatch,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = [
    { key: 'all', label: 'Todos os Scripts' },
    { key: 'objecao', label: '🛡️ Quebra de Objeções' },
    { key: 'abordagem', label: '⚡ Abordagem Inicial' },
    { key: 'followup', label: '⏱️ Follow-up Estratégico' },
    { key: 'fechamento', label: '🎯 Fechamento & Urgência' },
  ];

  const filteredScripts = SALES_PLAYBOOK.filter((script) => {
    if (activeCategory !== 'all' && script.category !== activeCategory) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      script.title.toLowerCase().includes(q) ||
      script.situation.toLowerCase().includes(q) ||
      script.template.toLowerCase().includes(q) ||
      script.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const personalizeScript = (template: string): string => {
    const nome = selectedLead?.responsibleName || 'Amigo(a)';
    const empresa = selectedLead?.companyName || 'sua empresa';
    const nicho = selectedLead?.niche || 'seu segmento';
    const cidade = selectedLead?.city || 'sua região';

    return template
      .replace(/{nome}/g, nome)
      .replace(/{responsavel}/g, nome)
      .replace(/{empresa}/g, empresa)
      .replace(/{nicho}/g, nicho)
      .replace(/{cidade}/g, cidade);
  };

  const handleCopy = (script: PlaybookScript) => {
    const textToCopy = personalizeScript(script.template);
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(script.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSendViaWhatsApp = (script: PlaybookScript) => {
    if (!selectedLead) return;
    const textToSend = personalizeScript(script.template);
    const cleanPhone = (selectedLead.phone || '').replace(/\D/g, '');
    if (!cleanPhone) {
      alert('Este lead não possui telefone cadastrado.');
      return;
    }
    const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(textToSend)}`;
    window.open(url, '_blank');

    if (onQuickDispatch) {
      onQuickDispatch(selectedLead, 'whatsapp');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Playbook Comercial & Quebra de Objeções
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                  Afenko B2B
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Roteiros prontos, respostas para travas de clientes e técnicas de fechamento para a equipe de vendas.
              </p>
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

        {/* Lead Context Banner (if preselected) */}
        {selectedLead && (
          <div className="px-6 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-blue-900">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Personalizando scripts para:{' '}
                <strong>{selectedLead.companyName}</strong> ({selectedLead.niche}) ·{' '}
                {selectedLead.phone || 'Sem tel'}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
              Variáveis automáticas ativas
            </span>
          </div>
        )}

        {/* Search & Filters */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por objeção (ex: 'caro', 'sócio', 'agência', 'sem site', 'concorrência')..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setActiveCategory(c.key)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  activeCategory === c.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Script Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {filteredScripts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-medium">Nenhum roteiro encontrado com esses termos.</p>
              <p className="text-xs text-slate-400">Tente buscar por "caro", "agência", "e-mail" ou limpe a busca.</p>
            </div>
          ) : (
            filteredScripts.map((script) => {
              const personalized = personalizeScript(script.template);
              const isCopied = copiedId === script.id;

              return (
                <div
                  key={script.id}
                  className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 sm:p-5 shadow-sm transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900">
                          {script.title}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                          {script.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {script.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(script)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Texto</span>
                          </>
                        )}
                      </button>

                      {selectedLead && (
                        <button
                          type="button"
                          onClick={() => handleSendViaWhatsApp(script)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar WhatsApp</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Situation & Tip */}
                  <div className="p-2.5 bg-blue-50/60 border border-blue-100 rounded-lg text-xs text-blue-900 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold">Dica de Aplicação: </strong>
                      <span>{script.tips}</span>
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4 text-xs sm:text-sm text-slate-800 font-sans whitespace-pre-line leading-relaxed selection:bg-blue-100">
                    {personalized}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {script.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            💡 <strong>Instrução da Gestão:</strong> Adapte sempre o tom ao porte do empresário e priorize chamadas no WhatsApp em horário comercial.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-semibold text-slate-800 rounded-lg transition-colors"
          >
            Fechar Playbook
          </button>
        </div>
      </div>
    </div>
  );
};
