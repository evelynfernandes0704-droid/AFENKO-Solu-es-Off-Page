import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { CnpjLookupResult, DiscoveredPlace, Lead } from '../types';

interface CnpjConsultantModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlace?: DiscoveredPlace | null;
  targetLead?: Lead | null;
  onApplyCnpjToFunnel: (
    cnpjData: CnpjLookupResult,
    targetPlace?: DiscoveredPlace | null,
    targetLead?: Lead | null
  ) => Promise<void>;
}

const SAMPLE_CNPJS = [
  { label: 'Magazine Luiza S/A (Varejo)', cnpj: '47960950000121' },
  { label: 'Raia Drogasil S/A (Saúde/Farmácia)', cnpj: '61585865000151' },
  { label: 'Localiza Rent a Car (Automotivo)', cnpj: '16670085000155' },
  { label: 'Totvs S/A (Tecnologia/Serviços)', cnpj: '53113791000122' },
];

export const CnpjConsultantModal: React.FC<CnpjConsultantModalProps> = ({
  isOpen,
  onClose,
  targetPlace,
  targetLead,
  onApplyCnpjToFunnel,
}) => {
  const [cnpjInput, setCnpjInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CnpjLookupResult | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Automatically discover and load CNPJ + Corporate Info when modal opens for a company
  useEffect(() => {
    if (!isOpen) return;

    setError(null);

    if (targetPlace || targetLead) {
      const companyName =
        targetPlace?.companyName || targetLead?.companyName || '';
      const address = targetPlace?.address || targetLead?.address || '';
      const city = targetPlace?.city || targetLead?.city || '';
      const niche = targetPlace?.niche || targetLead?.niche || '';
      const phone = targetPlace?.phone || targetLead?.phone || '';
      const existingCnpj = targetLead?.cnpj || '';

      setLoading(true);
      fetch('/api/cnpj/auto-discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          address,
          city,
          niche,
          phone,
          existingCnpj,
        }),
      })
        .then((res) => res.json())
        .then((data: CnpjLookupResult) => {
          setResult(data);
          setCnpjInput(data.cnpj || '');
        })
        .catch(() => {
          setError('Erro ao carregar automaticamente os dados cadastrais.');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Opened from header button without a specific company selected: auto-load a default CNPJ so it's never empty
      const defaultSample = SAMPLE_CNPJS[0].cnpj;
      setCnpjInput(defaultSample);
      handleLookup(defaultSample);
    }
  }, [isOpen, targetPlace, targetLead]);

  if (!isOpen) return null;

  const handleLookup = async (overrideCnpj?: string) => {
    const queryValue = overrideCnpj !== undefined ? overrideCnpj : cnpjInput;
    const clean = queryValue.replace(/\D/g, '');
    if (clean.length !== 14) {
      setError('Digite um CNPJ válido com 14 números.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/cnpj/${clean}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Não foi possível consultar este CNPJ.');
      } else {
        setResult(data as CnpjLookupResult);
        setCnpjInput(data.cnpj || clean);
      }
    } catch {
      setError('Erro de conexão ao consultar a base da Receita Federal.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await onApplyCnpjToFunnel(result, targetPlace, targetLead);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full overflow-hidden shadow-2xl my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Ficha Cadastral de CNPJ & Quadro Societário
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {targetPlace
                ? `Consulta automática para: ${targetPlace.companyName}`
                : targetLead
                ? `Dados cadastrais de: ${targetLead.companyName}`
                : 'Consulte qualquer CNPJ de 14 dígitos para extrair sócios, CNAE, telefone e e-mail'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              CNPJ Localizado (você também pode digitar outro CNPJ para consultar na Receita)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={cnpjInput}
                onChange={(e) => setCnpjInput(e.target.value)}
                placeholder="Ex: 00.000.000/0001-00"
                className="flex-1 h-10 px-3 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
              <button
                type="button"
                onClick={() => handleLookup()}
                disabled={loading}
                className="h-10 px-5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Search className="w-4 h-4" />
                <span>{loading ? 'Consultando...' : 'Consultar CNPJ'}</span>
              </button>
            </div>

            {/* Quick test CNPJs */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500">
                Testar consulta direta Receita:
              </span>
              {SAMPLE_CNPJS.map((item) => (
                <button
                  key={item.cnpj}
                  type="button"
                  onClick={() => {
                    setCnpjInput(item.cnpj);
                    handleLookup(item.cnpj);
                  }}
                  className="px-2 py-0.5 text-xs font-mono text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
              {error}
            </div>
          )}

          {loading && !result && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-5 bg-slate-200 rounded w-2/3" />
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="h-10 bg-slate-200 rounded" />
                <div className="h-10 bg-slate-200 rounded" />
              </div>
            </div>
          )}

          {result && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <div className="text-xs text-slate-500 font-mono tabular-nums">
                    <span className="font-bold text-slate-900">
                      CNPJ: {result.cnpj}
                    </span>
                    <span aria-hidden="true"> · </span>
                    <span className="text-emerald-700 font-semibold">
                      Situação: {result.situacaoCadastral}
                    </span>
                    {result.porte && (
                      <>
                        <span aria-hidden="true"> · </span>
                        <span>Porte: {result.porte}</span>
                      </>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {result.razaoSocial}
                  </h3>
                  {result.nomeFantasia && (
                    <p className="text-xs text-slate-600">
                      Nome Fantasia: {result.nomeFantasia}
                    </p>
                  )}
                </div>
                <div className="text-right font-mono tabular-nums">
                  <span className="text-xs text-slate-500 block">
                    Capital Social
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {result.capitalSocial.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">
                    CNAE / Atividade Principal (Nicho)
                  </span>
                  <span className="font-semibold text-slate-900">
                    {result.cnaePrincipal}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">
                    Sócio / Decisor Responsável (QSA)
                  </span>
                  <span className="font-semibold text-blue-700">
                    {result.responsavelSugerido || 'Não listado no QSA'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">
                    Telefone / WhatsApp Comercial
                  </span>
                  <span className="font-mono tabular-nums text-slate-900">
                    {result.telefone || 'Não informado'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">
                    E-mail Corporativo
                  </span>
                  <span className="font-mono text-slate-900">
                    {result.email || 'Não informado'}
                  </span>
                </div>

                <div className="md:col-span-2">
                  <span className="text-slate-500 block mb-0.5">
                    Endereço Fiscal Completo
                  </span>
                  <span className="text-slate-800">{result.endereco}</span>
                </div>

                {result.quadroSocietario.length > 0 && (
                  <div className="md:col-span-2">
                    <span className="text-slate-500 block mb-1">
                      Quadro de Sócios e Administradores (QSA)
                    </span>
                    <div className="text-slate-700 space-y-0.5">
                      {result.quadroSocietario.slice(0, 5).map((s, idx) => (
                        <div key={idx}>• {s}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {saving
                      ? 'Salvando Dados...'
                      : targetPlace || targetLead
                      ? 'Confirmar CNPJ & Salvar na Planilha'
                      : 'Importar CNPJ como Novo Lead no Funil'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
