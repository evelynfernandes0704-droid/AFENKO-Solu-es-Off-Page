import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Mail,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Lead, WEBSITE_STATUS_META } from '../types';

interface ProposalBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  consultantName: string;
  groqConfigured: boolean;
  onSaveProposal: (
    leadId: string,
    updates: {
      proposalValue: number;
      proposalWhatsapp: string;
      proposalEmailSubject: string;
      proposalEmailBody: string;
      responsibleName: string;
      phone: string;
      email: string;
    }
  ) => Promise<void>;
  onRecordDispatch: (
    lead: Lead,
    channel: 'whatsapp' | 'email',
    messagePreview: string,
    aiModelUsed: string
  ) => Promise<void>;
}

export const SENDER_EMAIL = 'contactevelynfernandes@gmail.com';
export const SENDER_PHONE = '11 97888-1952';

export function formatWhatsAppDeepLink(phone: string, text: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  const fullPhone =
    digits.length >= 10 && !digits.startsWith('55') ? `55${digits}` : digits;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
}

export function formatMailtoDeepLink(
  email: string,
  subject: string,
  body: string
): string {
  return `mailto:${encodeURIComponent(email || '')}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

export function formatGmailWebLink(
  toEmail: string,
  subject: string,
  body: string
): string {
  return `https://mail.google.com/mail/?authuser=${encodeURIComponent(
    SENDER_EMAIL
  )}&view=cm&fs=1&tf=1&to=${encodeURIComponent(
    toEmail || ''
  )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const ProposalBotModal: React.FC<ProposalBotModalProps> = ({
  isOpen,
  onClose,
  lead,
  consultantName,
  groqConfigured,
  onSaveProposal,
  onRecordDispatch,
}) => {
  const [responsibleName, setResponsibleName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [proposalValue, setProposalValue] = useState<number>(1490);
  const [deliveryDays, setDeliveryDays] = useState<number>(5);

  const [whatsappText, setWhatsappText] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailBody, setEmailBody] = useState<string>('');
  const [modelUsed, setModelUsed] = useState<string>('Groq Llama 3.3 70B');

  const [generating, setGenerating] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [copiedWa, setCopiedWa] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (lead && isOpen) {
      setResponsibleName(lead.responsibleName || '');
      setPhone(lead.phone || '');
      setEmail(lead.email || '');
      setProposalValue(lead.proposalValue || 1490);
      setWhatsappText(lead.proposalWhatsapp || '');
      setEmailSubject(lead.proposalEmailSubject || '');
      setEmailBody(lead.proposalEmailBody || '');
      setDispatchSuccessMsg(null);

      // Auto-generate if no proposal has been generated yet
      if (!lead.proposalWhatsapp) {
        triggerBotGeneration(lead, lead.proposalValue || 1490, 5, lead.responsibleName || '');
      }
    }
  }, [lead, isOpen]);

  if (!isOpen || !lead) return null;

  const triggerBotGeneration = async (
    targetLead: Lead,
    val: number,
    days: number,
    respName: string
  ) => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: targetLead.companyName,
          tradeName: targetLead.tradeName,
          cnpj: targetLead.cnpj,
          niche: targetLead.niche,
          address: targetLead.address,
          city: targetLead.city,
          responsibleName: respName,
          websiteStatus: targetLead.websiteStatus,
          websiteUrl: targetLead.websiteUrl,
          rating: targetLead.rating,
          userRatingCount: targetLead.userRatingCount,
          proposalValue: val,
          deliveryDays: days,
          consultantName,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setWhatsappText(data.whatsappMessage || '');
        setEmailSubject(data.emailSubject || '');
        setEmailBody(data.emailBody || '');
        setModelUsed(data.modelUsed || 'Groq Bot');
      }
    } catch (err) {
      console.error('Erro ao gerar proposta comercial:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveProposal(lead.id, {
        proposalValue,
        proposalWhatsapp: whatsappText,
        proposalEmailSubject: emailSubject,
        proposalEmailBody: emailBody,
        responsibleName,
        phone,
        email,
      });
      setDispatchSuccessMsg('Proposta salva na planilha e funil atualizado!');
    } finally {
      setSaving(false);
    }
  };

  const handleWhatsAppSend = async () => {
    await onSaveProposal(lead.id, {
      proposalValue,
      proposalWhatsapp: whatsappText,
      proposalEmailSubject: emailSubject,
      proposalEmailBody: emailBody,
      responsibleName,
      phone,
      email,
    });
    await onRecordDispatch(
      { ...lead, responsibleName, phone, email },
      'whatsapp',
      whatsappText,
      modelUsed
    );
    setDispatchSuccessMsg(
      'Envio via WhatsApp registrado no Painel de Controle!'
    );
  };

  const handleEmailSend = async () => {
    await onSaveProposal(lead.id, {
      proposalValue,
      proposalWhatsapp: whatsappText,
      proposalEmailSubject: emailSubject,
      proposalEmailBody: emailBody,
      responsibleName,
      phone,
      email,
    });
    await onRecordDispatch(
      { ...lead, responsibleName, phone, email },
      'email',
      `${emailSubject}\n\n${emailBody}`,
      modelUsed
    );
    setDispatchSuccessMsg('Envio via E-mail registrado no Painel de Controle!');
  };

  const waHref = formatWhatsAppDeepLink(phone, whatsappText);
  const mailHref = formatMailtoDeepLink(email, emailSubject, emailBody);
  const gmailWebHref = formatGmailWebLink(email, emailSubject, emailBody);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-4xl w-full overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Remetente: {SENDER_EMAIL}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">WhatsApp: {SENDER_PHONE}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-blue-500">
                {groqConfigured
                  ? 'Motor: Groq API (Llama 3.3 70B)'
                  : `Motor Ativo: ${modelUsed}`}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {lead.companyName} — Nicho: {lead.niche}
            </h2>
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
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Parameters Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sócio / Responsável
              </label>
              <input
                type="text"
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                placeholder="Nome do decisor"
                className="w-full h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Destino
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full h-9 px-2.5 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail do Responsável
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contato@empresa.com.br"
                className="w-full h-9 px-2.5 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor Off-Page (R$)
              </label>
              <input
                type="number"
                value={proposalValue}
                onChange={(e) => setProposalValue(Number(e.target.value))}
                className="w-full h-9 px-2.5 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={() =>
                  triggerBotGeneration(
                    lead,
                    proposalValue,
                    deliveryDays,
                    responsibleName
                  )
                }
                disabled={generating}
                className="w-full h-9 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`}
                />
                <span>
                  {generating ? 'Personalizando...' : 'Regerar com Bot'}
                </span>
              </button>
            </div>
          </div>

          {dispatchSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-medium">
              {dispatchSuccessMsg}
            </div>
          )}

          {/* Two Columns: WhatsApp Script vs Email Proposal */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Column 1: WhatsApp Pitch (5 cols) */}
            <div className="lg:col-span-5 flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">
                  01. Abordagem Direta para WhatsApp
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(whatsappText);
                    setCopiedWa(true);
                    setTimeout(() => setCopiedWa(false), 2000);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  {copiedWa ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                rows={12}
                value={whatsappText}
                onChange={(e) => setWhatsappText(e.target.value)}
                className="w-full p-3 text-xs leading-relaxed bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 flex-1"
              />

              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsAppSend}
                className="h-10 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
              >
                <Send className="w-4 h-4" />
                <span>Enviar via WhatsApp & Registrar Status</span>
              </a>
            </div>

            {/* Column 2: Complete Email Off-Page Proposal (7 cols) */}
            <div className="lg:col-span-7 flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">
                  02. Proposta Comercial Completa (E-mail / Apresentação)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Assunto: ${emailSubject}\n\n${emailBody}`
                    );
                    setCopiedEmail(true);
                    setTimeout(() => setCopiedEmail(false), 2000);
                  }}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar E-mail</span>
                    </>
                  )}
                </button>
              </div>

              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Assunto do e-mail comercial"
                className="w-full h-9 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />

              <textarea
                rows={10}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full p-3 text-xs leading-relaxed bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 flex-1"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href={gmailWebHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleEmailSend}
                  className="h-10 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Mail className="w-4 h-4" />
                  <span>Enviar pelo Gmail ({SENDER_EMAIL.split('@')[0]})</span>
                </a>

                <a
                  href={mailHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleEmailSend}
                  className="h-10 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                >
                  <Mail className="w-4 h-4" />
                  <span>Abrir App de E-mail ( Celular / PC )</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Status atual do site:{' '}
            <strong className="text-slate-800">
              {WEBSITE_STATUS_META[lead.websiteStatus].label}
            </strong>
          </span>

          <div className="flex items-center gap-3">
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
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
            >
              {saving ? 'Salvando...' : 'Salvar Proposta no Lead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
