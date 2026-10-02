export type WebsiteStatus =
  | 'no_website'
  | 'outdated_website'
  | 'social_only'
  | 'active_website';

export type FunnelStage =
  | 'extraido'
  | 'enriquecido'
  | 'proposta_gerada'
  | 'proposta_enviada'
  | 'em_negociacao'
  | 'fechado'
  | 'perdido';

export type DispatchChannel = 'none' | 'whatsapp' | 'email' | 'both';

export type DispatchStatus =
  | 'pendente'
  | 'enviado'
  | 'entregue'
  | 'visualizado'
  | 'respondido'
  | 'erro';

export type EmployeeUsername =
  | 'vendas'
  | 'funcionário01'
  | 'funcionário02'
  | 'funcionário03';

export interface TeamMemberMeta {
  username: EmployeeUsername;
  loginLabel: string;
  passwordHint: string;
  displayName: string;
  role: 'admin' | 'employee';
  badgeColor: string;
}

export const TEAM_MEMBERS: TeamMemberMeta[] = [
  {
    username: 'vendas',
    loginLabel: 'vendas',
    passwordHint: 'vendas123',
    displayName: 'Evelyn Fernandes (Gestora)',
    role: 'admin',
    badgeColor: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  {
    username: 'funcionário01',
    loginLabel: 'funcionário01',
    passwordHint: 'negócios123',
    displayName: 'Funcionário 01',
    role: 'employee',
    badgeColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  {
    username: 'funcionário02',
    loginLabel: 'funcionário02',
    passwordHint: 'negócios456',
    displayName: 'Funcionário 02',
    role: 'employee',
    badgeColor: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  {
    username: 'funcionário03',
    loginLabel: 'funcionário03',
    passwordHint: 'negócios789',
    displayName: 'Funcionário 03',
    role: 'employee',
    badgeColor: 'text-purple-700 bg-purple-50 border-purple-200',
  },
];

export const TEAM_EMPLOYEES = TEAM_MEMBERS.filter((m) => m.role === 'employee');

export interface Lead {
  id: string;
  ownerId: string;
  assignedTo?: string; // 'funcionário01' | 'funcionário02' | 'funcionário03' | 'vendas' | ''
  assignedToName?: string;
  companyName: string;
  tradeName?: string;
  cnpj?: string;
  niche: string;
  address: string;
  city?: string;
  phone?: string;
  email?: string;
  responsibleName?: string;
  websiteStatus: WebsiteStatus;
  websiteUrl?: string;
  googlePlaceId?: string;
  rating?: number;
  userRatingCount?: number;
  lat?: number;
  lng?: number;
  funnelStage: FunnelStage;
  proposalValue: number;
  proposalWhatsapp?: string;
  proposalEmailSubject?: string;
  proposalEmailBody?: string;
  lastDispatchChannel?: DispatchChannel;
  lastDispatchStatus?: DispatchStatus;
  notes?: string;
  lostReason?: string;
  lostNotes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type LostReasonKey =
  | 'preco_alto'
  | 'ja_tem_fornecedor'
  | 'sem_interesse'
  | 'contato_invalido'
  | 'nao_respondeu'
  | 'outro';

export const LOST_REASONS: Record<LostReasonKey, { label: string; desc: string }> = {
  preco_alto: {
    label: 'Preço Elevado / Sem Orçamento',
    desc: 'Achou o investimento fora da realidade financeira atual',
  },
  ja_tem_fornecedor: {
    label: 'Já Possui Fornecedor / Agência',
    desc: 'Já tem contrato ativo com outra empresa de tecnologia/SEO',
  },
  sem_interesse: {
    label: 'Sem Interesse no Momento',
    desc: 'Não vê prioridade ou pediu para tentar novamente em alguns meses',
  },
  contato_invalido: {
    label: 'Contato Inválido / Não é o Decisor',
    desc: 'Telefone incorreto, número não existe ou não conseguiu falar com sócio',
  },
  nao_respondeu: {
    label: 'Sem Resposta (Após 3 Follow-ups)',
    desc: 'Mensagens entregues/visualizadas mas sem nenhum retorno',
  },
  outro: {
    label: 'Outro Motivo',
    desc: 'Especificar no campo de observações',
  },
};

export interface CompanyNotice {
  id: string;
  title: string;
  message: string;
  author: string;
  priority: 'alta' | 'normal' | 'alerta';
  createdAt: string;
  pinned?: boolean;
}

export interface DailyChecklistState {
  date: string; // YYYY-MM-DD
  followupDone: boolean;
  appointmentsDone: boolean;
  newProposalsDone: boolean;
  crmUpdatedDone: boolean;
}

export interface DispatchLog {
  id: string;
  ownerId: string;
  dispatchedBy?: string;
  dispatchedByName?: string;
  leadId: string;
  companyName: string;
  recipientName?: string;
  recipientContact: string;
  niche: string;
  channel: 'whatsapp' | 'email';
  status: 'enviado' | 'entregue' | 'visualizado' | 'respondido' | 'erro';
  messagePreview: string;
  aiModelUsed?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface CnpjLookupResult {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnaePrincipal: string;
  cnaeCodigo: string;
  situacaoCadastral: string;
  dataAbertura: string;
  porte: string;
  capitalSocial: number;
  telefone: string;
  email: string;
  endereco: string;
  municipio: string;
  uf: string;
  responsavelSugerido: string;
  quadroSocietario: string[];
}

export interface DiscoveredPlace {
  placeId: string;
  companyName: string;
  niche: string;
  address: string;
  city: string;
  phone: string;
  websiteUrl: string;
  websiteStatus: WebsiteStatus;
  rating: number;
  userRatingCount: number;
  lat: number;
  lng: number;
  googleMapsUri: string;
}

// ----------------------------------------------------
// 3. Pontuação de Oportunidades (Lead Scoring)
// ----------------------------------------------------
export type ScoreTier = 'maxima' | 'alta' | 'media' | 'baixa';

export interface LeadScoreInfo {
  score: number; // 0 a 100
  tier: ScoreTier;
  tierLabel: string;
  tierBadgeClass: string;
  breakdown: { label: string; points: number }[];
}

export function calculateLeadScore(lead: Partial<Lead>): LeadScoreInfo {
  let score = 0;
  const breakdown: { label: string; points: number }[] = [];

  // Critério 1: Presença digital (Sem site = maior dor comercial)
  if (lead.websiteStatus === 'no_website') {
    score += 40;
    breakdown.push({ label: 'Sem site no Google Maps (+40)', points: 40 });
  } else if (lead.websiteStatus === 'social_only') {
    score += 30;
    breakdown.push({ label: 'Apenas redes sociais / Linktree (+30)', points: 30 });
  } else if (lead.websiteStatus === 'outdated_website') {
    score += 20;
    breakdown.push({ label: 'Site desatualizado ou HTTP (+20)', points: 20 });
  } else {
    score += 5;
    breakdown.push({ label: 'Possui site (+5)', points: 5 });
  }

  // Critério 2: Nicho de Alto Ticket / Alta Demanda
  const nicheLower = (lead.niche || '').toLowerCase();
  const highValueNiches = [
    'advoca', 'clínic', 'medic', 'odontolog', 'dentist', 'estétic',
    'engenhar', 'arquitet', 'contabil', 'consultor', 'imobiliár', 'auto', 'veícul'
  ];
  if (highValueNiches.some((n) => nicheLower.includes(n))) {
    score += 25;
    breakdown.push({ label: 'Nicho comercial de alto ticket (+25)', points: 25 });
  } else {
    score += 15;
    breakdown.push({ label: 'Nicho padrão (+15)', points: 15 });
  }

  // Critério 3: Contato Direto Disponível (WhatsApp/Telefone)
  const cleanPhone = (lead.phone || '').replace(/\D/g, '');
  if (cleanPhone.length >= 10) {
    score += 15;
    breakdown.push({ label: 'WhatsApp / Telefone identificado (+15)', points: 15 });
  }

  // Critério 4: Validação Cadastral CNPJ
  const cleanCnpj = (lead.cnpj || '').replace(/\D/g, '');
  if (cleanCnpj.length === 14) {
    score += 10;
    breakdown.push({ label: 'CNPJ oficial Receita Federal validado (+10)', points: 10 });
  }

  // Critério 5: Engajamento / Estágio no Funil
  if (lead.funnelStage === 'em_negociacao') {
    score += 10;
    breakdown.push({ label: 'Negociação ativa em andamento (+10)', points: 10 });
  } else if (
    lead.funnelStage === 'proposta_enviada' ||
    lead.funnelStage === 'proposta_gerada'
  ) {
    score += 8;
    breakdown.push({ label: 'Proposta estruturada (+8)', points: 8 });
  }

  score = Math.min(100, Math.max(0, score));

  let tier: ScoreTier = 'baixa';
  let tierLabel = 'Frio (Baixa Prioridade)';
  let tierBadgeClass = 'text-slate-600 bg-slate-100 border-slate-300';

  if (score >= 75) {
    tier = 'maxima';
    tierLabel = '⭐ Prioridade Máxima';
    tierBadgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-300 font-bold';
  } else if (score >= 55) {
    tier = 'alta';
    tierLabel = '🔥 Alta Oportunidade';
    tierBadgeClass = 'text-blue-700 bg-blue-50 border-blue-300 font-semibold';
  } else if (score >= 35) {
    tier = 'media';
    tierLabel = '⚡ Morno';
    tierBadgeClass = 'text-amber-700 bg-amber-50 border-amber-300';
  }

  return { score, tier, tierLabel, tierBadgeClass, breakdown };
}

// ----------------------------------------------------
// 2. Sistema Inteligente de Follow-up
// ----------------------------------------------------
export interface FollowUpAlert {
  leadId: string;
  lead: Lead;
  daysStagnant: number;
  reason: string;
  urgency: 'critica' | 'atencao' | 'normal';
  suggestedAction: string;
}

export function getLeadFollowUpAlert(lead: Lead): FollowUpAlert | null {
  if (lead.funnelStage === 'fechado' || lead.funnelStage === 'perdido') {
    return null;
  }

  const dateStr = lead.updatedAt || lead.createdAt;
  const lastDate = dateStr ? new Date(dateStr) : new Date(Date.now() - 3 * 86400000);
  const diffHours = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60);
  const daysStagnant = Math.max(1, Math.floor(diffHours / 24));

  if (lead.funnelStage === 'proposta_enviada' && daysStagnant >= 2) {
    return {
      leadId: lead.id,
      lead,
      daysStagnant,
      reason: `Proposta enviada há ${daysStagnant} dias sem resposta`,
      urgency: daysStagnant >= 4 ? 'critica' : 'atencao',
      suggestedAction:
        'Disparar mensagem de reaquecimento no WhatsApp (Follow-up 1)',
    };
  }

  if (lead.funnelStage === 'em_negociacao' && daysStagnant >= 2) {
    return {
      leadId: lead.id,
      lead,
      daysStagnant,
      reason: `Negociação parada há ${daysStagnant} dias sem avanço`,
      urgency: daysStagnant >= 3 ? 'critica' : 'atencao',
      suggestedAction:
        'Ligar ou enviar condição especial com bônus de fechamento rápido',
    };
  }

  if (
    (lead.funnelStage === 'extraido' || lead.funnelStage === 'enriquecido') &&
    daysStagnant >= 3
  ) {
    return {
      leadId: lead.id,
      lead,
      daysStagnant,
      reason: `Lead aguardando proposta há ${daysStagnant} dias`,
      urgency: 'atencao',
      suggestedAction: 'Gerar proposta no Bot Groq e iniciar abordagem comercial',
    };
  }

  return null;
}

// ----------------------------------------------------
// 4. Histórico Completo de Interações
// ----------------------------------------------------
export type ActivityType =
  | 'creation'
  | 'cnpj_lookup'
  | 'proposal_generated'
  | 'proposal_dispatched'
  | 'stage_changed'
  | 'followup_sent'
  | 'note_added'
  | 'reassigned';

export interface LeadActivity {
  id: string;
  leadId: string;
  type: ActivityType;
  title: string;
  description: string;
  authorName: string;
  timestamp: string; // ISO string
  channel?: 'whatsapp' | 'email';
}

// ----------------------------------------------------
// 5. Agenda Comercial Integrada
// ----------------------------------------------------
export type AppointmentType = 'reuniao' | 'ligacao' | 'whatsapp' | 'email';
export type AppointmentStatus = 'pendente' | 'concluido' | 'cancelado';

export interface CommercialAppointment {
  id: string;
  leadId?: string;
  leadCompanyName: string;
  leadPhone?: string;
  leadContactName?: string;
  assignedTo: string; // 'funcionário01' | 'vendas', etc.
  assignedToName: string;
  title: string;
  type: AppointmentType;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  notes?: string;
  status: AppointmentStatus;
  createdAt: string;
}

// ----------------------------------------------------
// 1. Indicadores de Desempenho da Equipe
// ----------------------------------------------------
export interface EmployeePerformance {
  username: string;
  displayName: string;
  totalAssigned: number;
  proposalsGenerated: number;
  proposalsSent: number;
  inNegotiation: number;
  closedDeals: number;
  lostDeals: number;
  totalRevenue: number;
  conversionRate: number; // percentage (0 - 100)
  pendingFollowups: number;
  attentionNotes: string[];
}

export function formatWhatsAppDeepLink(phone: string, text: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  const fullPhone =
    digits.length >= 10 && !digits.startsWith('55') ? `55${digits}` : digits;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
}

export const FUNNEL_STAGE_META: Record<
  FunnelStage,
  { label: string; shortLabel: string; badgeClass: string }
> = {
  extraido: {
    label: '01. Extraído (Sem Site)',
    shortLabel: 'Extraído',
    badgeClass: 'text-slate-700',
  },
  enriquecido: {
    label: '02. CNPJ & Contato',
    shortLabel: 'CNPJ Validado',
    badgeClass: 'text-blue-700',
  },
  proposta_gerada: {
    label: '03. Proposta Gerada (Bot)',
    shortLabel: 'Proposta Pronta',
    badgeClass: 'text-indigo-700',
  },
  proposta_enviada: {
    label: '04. Proposta Enviada',
    shortLabel: 'Enviada',
    badgeClass: 'text-amber-700',
  },
  em_negociacao: {
    label: '05. Em Negociação',
    shortLabel: 'Negociação',
    badgeClass: 'text-purple-700',
  },
  fechado: {
    label: '06. Fechado (Contrato)',
    shortLabel: 'Fechado',
    badgeClass: 'text-emerald-700',
  },
  perdido: {
    label: 'Perdido / Arquivado',
    shortLabel: 'Arquivado',
    badgeClass: 'text-rose-700',
  },
};

export const WEBSITE_STATUS_META: Record<
  WebsiteStatus,
  { label: string; opportunityLevel: string; colorClass: string }
> = {
  no_website: {
    label: 'Sem Site no Maps',
    opportunityLevel: 'Oportunidade Máxima Off-Page',
    colorClass: 'text-rose-600 font-semibold',
  },
  social_only: {
    label: 'Apenas Rede Social / Linktree',
    opportunityLevel: 'Alta Oportunidade Off-Page',
    colorClass: 'text-amber-600 font-semibold',
  },
  outdated_website: {
    label: 'Site HTTP / Desatualizado',
    opportunityLevel: 'Modernização Off-Page',
    colorClass: 'text-amber-700 font-medium',
  },
  active_website: {
    label: 'Possui Site Próprio',
    opportunityLevel: 'Baixa Prioridade',
    colorClass: 'text-slate-500',
  },
};
