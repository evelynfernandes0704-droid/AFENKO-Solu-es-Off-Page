import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  Archive,
  CheckCircle2,
  DollarSign,
  UserX,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { Lead, LOST_REASONS, LostReasonKey } from '../types';

interface LostReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onConfirmLost: (leadId: string, reasonKey: LostReasonKey, notes: string) => Promise<void>;
}

export const LostReasonModal: React.FC<LostReasonModalProps> = ({
  isOpen,
  onClose,
  lead,
  onConfirmLost,
}) => {
  const [selectedReason, setSelectedReason] = useState<LostReasonKey>('nao_respondeu');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await onConfirmLost(lead.id, selectedReason, notes);
      onClose();
    } catch (err) {
      console.error('Erro ao registrar motivo de perda:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-rose-900 text-white flex items-center justify-between border-b border-rose-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/40 border border-rose-400/50 flex items-center justify-center text-rose-200">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-500/30 text-rose-200 border border-rose-400/40 px-2 py-0.5 rounded-full">
                Registro de Não Fechamento
              </span>
              <h2 className="text-base font-bold text-white mt-0.5 truncate max-w-xs sm:max-w-sm">
                Motivo de Perda: {lead.companyName}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-rose-300 hover:text-white rounded-lg hover:bg-rose-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 text-xs">
          <p className="text-slate-600">
            Para manter as métricas comerciais profissionais e gerar diagnósticos precisos para a gestão, selecione a principal razão pelo qual o negócio não evoluiu:
          </p>

          <div className="space-y-2">
            {(Object.entries(LOST_REASONS) as [LostReasonKey, { label: string; desc: string }][]).map(
              ([key, data]) => {
                const isSelected = selectedReason === key;
                return (
                  <label
                    key={key}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-rose-50/70 border-rose-500 text-rose-950 ring-1 ring-rose-500'
                        : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="lostReason"
                      value={key}
                      checked={isSelected}
                      onChange={() => setSelectedReason(key)}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-xs text-slate-900">{data.label}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{data.desc}</div>
                    </div>
                  </label>
                );
              }
            )}
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Observações adicionais ou feedback do cliente (opcional):
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: 'Cliente achou R$ 1.490 alto, ofereceu R$ 800 à vista', ou 'Disse que está focando em reforma física até o próximo trimestre'..."
              rows={3}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Salvando...' : 'Confirmar e Arquivar Lead'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
