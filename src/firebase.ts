import { Lead, DispatchLog, LeadActivity, CommercialAppointment } from './types';

// Safe storage helpers for mobile browsers / cross-origin iframes (Safari ITP, Android WebView)
const memoryStorage = new Map<string, string>();

export function safeGetStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {
    // Blocked third-party storage in mobile iframe; fallback to memory
  }
  return memoryStorage.get(key) ?? null;
}

export function safeSetStorage(key: string, value: string): void {
  memoryStorage.set(key, value);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore storage quota or SecurityError on mobile
  }
}

export function safeRemoveStorage(key: string): void {
  memoryStorage.delete(key);
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Ignore SecurityError on mobile
  }
}

export const db = null;
export const auth: { currentUser?: any } | null = null;

export interface AppUserSession {
  uid: string;
  username: string;
  displayName: string;
  role: 'admin' | 'employee';
  email: string;
  phone?: string;
}

const SESSION_STORAGE_KEY = 'geolead_auth_session_v1';
const LOCAL_LEADS_KEY = 'geolead_leads_backup_v1';
const LOCAL_DISPATCHES_KEY = 'geolead_dispatches_backup_v1';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider: any) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const DEFAULT_VENDAS_SESSION: AppUserSession = {
  uid: 'user_vendas_oficial',
  username: 'vendas',
  displayName: 'Evelyn Fernandes (Gestora)',
  role: 'admin',
  email: 'contactevelynfernandes@gmail.com',
  phone: '11 97888-1952',
};

export function getSavedUserSession(): AppUserSession | null {
  try {
    const raw = safeGetStorage(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppUserSession;
    if (!parsed.role) {
      parsed.role = parsed.username === 'vendas' ? 'admin' : 'employee';
    }
    return parsed;
  } catch {
    return null;
  }
}

function normalizeText(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export async function loginWithCredentials(
  username: string,
  password: string
): Promise<AppUserSession> {
  const cleanUser = username.trim();
  const cleanPass = password.trim();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUser, password: cleanPass }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.authenticated && data.user) {
        safeSetStorage(SESSION_STORAGE_KEY, JSON.stringify(data.user));
        return data.user as AppUserSession;
      }
    }
  } catch {
    // Fallback local verification if offline
  }

  const normUser = normalizeText(cleanUser);
  const normPass = normalizeText(cleanPass);

  if (normUser === 'vendas' && normPass === 'vendas123') {
    safeSetStorage(
      SESSION_STORAGE_KEY,
      JSON.stringify(DEFAULT_VENDAS_SESSION)
    );
    return DEFAULT_VENDAS_SESSION;
  }

  if (normUser === 'funcionario01' && normPass === 'negocios123') {
    const session: AppUserSession = {
      uid: 'user_funcionario_01',
      username: 'funcionário01',
      displayName: 'Funcionário 01',
      role: 'employee',
      email: 'contactevelynfernandes@gmail.com',
      phone: '11 97888-1952',
    };
    safeSetStorage(SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  if (normUser === 'funcionario02' && normPass === 'negocios456') {
    const session: AppUserSession = {
      uid: 'user_funcionario_02',
      username: 'funcionário02',
      displayName: 'Funcionário 02',
      role: 'employee',
      email: 'contactevelynfernandes@gmail.com',
      phone: '11 97888-1952',
    };
    safeSetStorage(SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  if (normUser === 'funcionario03' && normPass === 'negocios789') {
    const session: AppUserSession = {
      uid: 'user_funcionario_03',
      username: 'funcionário03',
      displayName: 'Funcionário 03',
      role: 'employee',
      email: 'contactevelynfernandes@gmail.com',
      phone: '11 97888-1952',
    };
    safeSetStorage(SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  }

  throw new Error(
    'Usuário ou senha inválidos. Verifique suas credenciais de acesso.'
  );
}

export function signOutUser(): void {
  safeRemoveStorage(SESSION_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('geolead-data-updated'));
}

export function sanitizeId(raw?: string): string {
  const base = (
    raw || `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  )
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
  return base || `id_${Date.now()}`;
}

export async function fetchAllCrmData(): Promise<{
  leads: Lead[];
  dispatches: DispatchLog[];
}> {
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      const data = await res.json();
      const leads = Array.isArray(data.leads) ? data.leads : [];
      const dispatches = Array.isArray(data.dispatches) ? data.dispatches : [];
      safeSetStorage(LOCAL_LEADS_KEY, JSON.stringify(leads));
      safeSetStorage(LOCAL_DISPATCHES_KEY, JSON.stringify(dispatches));
      return { leads, dispatches };
    }
  } catch (e) {
    console.warn('Usando cache local de leads:', e);
  }

  try {
    const localLeads = JSON.parse(safeGetStorage(LOCAL_LEADS_KEY) || '[]');
    const localDispatches = JSON.parse(
      safeGetStorage(LOCAL_DISPATCHES_KEY) || '[]'
    );
    return {
      leads: Array.isArray(localLeads) ? localLeads : [],
      dispatches: Array.isArray(localDispatches) ? localDispatches : [],
    };
  } catch {
    return { leads: [], dispatches: [] };
  }
}

function notifyDataUpdated() {
  window.dispatchEvent(new CustomEvent('geolead-data-updated'));
}

export async function createLeadInDb(
  ownerId: string,
  input: Partial<Lead> & {
    companyName: string;
    niche: string;
    address: string;
  }
): Promise<string> {
  const leadId = sanitizeId(input.id || input.googlePlaceId);

  const payload: Lead = {
    id: leadId,
    ownerId: ownerId.slice(0, 128),
    assignedTo: input.assignedTo || '',
    assignedToName: input.assignedToName || '',
    companyName: (input.companyName || 'Empresa Local').slice(0, 200),
    tradeName: (input.tradeName || input.companyName || '').slice(0, 200),
    cnpj: (input.cnpj || '').slice(0, 30),
    niche: (input.niche || 'Comércio Local').slice(0, 120),
    address: (input.address || 'Endereço não informado').slice(0, 400),
    city: (input.city || '').slice(0, 120),
    phone: (input.phone || '').slice(0, 60),
    email: (input.email || '').slice(0, 160),
    responsibleName: (input.responsibleName || '').slice(0, 160),
    websiteStatus: input.websiteStatus || 'no_website',
    websiteUrl: (input.websiteUrl || '').slice(0, 500),
    googlePlaceId: (input.googlePlaceId || '').slice(0, 200),
    rating:
      typeof input.rating === 'number'
        ? Math.min(5, Math.max(0, input.rating))
        : 0,
    userRatingCount:
      typeof input.userRatingCount === 'number'
        ? Math.max(0, input.userRatingCount)
        : 0,
    lat: typeof input.lat === 'number' ? input.lat : -23.5505,
    lng: typeof input.lng === 'number' ? input.lng : -46.6333,
    funnelStage: input.funnelStage || 'extraido',
    proposalValue:
      typeof input.proposalValue === 'number' && input.proposalValue >= 0
        ? Math.min(10000000, input.proposalValue)
        : 1490,
    proposalWhatsapp: (input.proposalWhatsapp || '').slice(0, 4000),
    proposalEmailSubject: (input.proposalEmailSubject || '').slice(0, 300),
    proposalEmailBody: (input.proposalEmailBody || '').slice(0, 8000),
    lastDispatchChannel: input.lastDispatchChannel || 'none',
    lastDispatchStatus: input.lastDispatchStatus || 'pendente',
    notes: (input.notes || '').slice(0, 2000),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    const current = JSON.parse(safeGetStorage(LOCAL_LEADS_KEY) || '[]');
    safeSetStorage(LOCAL_LEADS_KEY, JSON.stringify([payload, ...current]));
  }

  notifyDataUpdated();
  return leadId;
}

export async function updateLeadInDb(
  leadId: string,
  updates: Partial<Omit<Lead, 'id' | 'ownerId' | 'createdAt'>>
): Promise<void> {
  const cleanId = sanitizeId(leadId);
  try {
    await fetch(`/api/leads/${cleanId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  } catch {
    // Ignore network glitch
  }
  notifyDataUpdated();
}

export async function deleteLeadFromDb(leadId: string): Promise<void> {
  const cleanId = sanitizeId(leadId);
  try {
    await fetch(`/api/leads/${cleanId}`, {
      method: 'DELETE',
    });
  } catch {
    // Ignore network glitch
  }
  notifyDataUpdated();
}

export async function createDispatchLogInDb(
  ownerId: string,
  input: {
    leadId: string;
    dispatchedBy?: string;
    dispatchedByName?: string;
    companyName: string;
    recipientName?: string;
    recipientContact: string;
    niche: string;
    channel: 'whatsapp' | 'email';
    status?: 'enviado' | 'entregue' | 'visualizado' | 'respondido' | 'erro';
    messagePreview: string;
    aiModelUsed?: string;
  }
): Promise<string> {
  const dispatchId = sanitizeId(
    `disp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  );

  const payload: DispatchLog = {
    id: dispatchId,
    ownerId: ownerId.slice(0, 128),
    dispatchedBy: input.dispatchedBy || '',
    dispatchedByName: input.dispatchedByName || '',
    leadId: sanitizeId(input.leadId),
    companyName: (input.companyName || 'Empresa').slice(0, 200),
    recipientName: (input.recipientName || 'Responsável').slice(0, 160),
    recipientContact: (input.recipientContact || 'Contato').slice(0, 160),
    niche: (input.niche || 'Comércio').slice(0, 120),
    channel: input.channel,
    status: input.status || 'enviado',
    messagePreview: (
      input.messagePreview || 'Proposta comercial enviada'
    ).slice(0, 4000),
    aiModelUsed: (input.aiModelUsed || 'Groq Bot').slice(0, 100),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await fetch('/api/dispatches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    const current = JSON.parse(safeGetStorage(LOCAL_DISPATCHES_KEY) || '[]');
    safeSetStorage(LOCAL_DISPATCHES_KEY, JSON.stringify([payload, ...current]));
  }

  notifyDataUpdated();
  return dispatchId;
}

export async function updateDispatchStatusInDb(
  dispatchId: string,
  status: DispatchLog['status']
): Promise<void> {
  const cleanId = sanitizeId(dispatchId);
  try {
    await fetch(`/api/dispatches/${cleanId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  } catch {
    // Ignore network glitch
  }
  notifyDataUpdated();
}

// ----------------------------------------------------
// Lead Activities & Timeline Persistence
// ----------------------------------------------------
const LOCAL_ACTIVITIES_KEY = 'geolead_activities_backup_v1';

export async function fetchLeadActivities(leadId?: string): Promise<LeadActivity[]> {
  try {
    const url = leadId ? `/api/activities?leadId=${encodeURIComponent(leadId)}` : '/api/activities';
    const res = await fetch(url);
    if (res.ok) {
      return (await res.json()) as LeadActivity[];
    }
  } catch {
    // fallback to storage
  }
  try {
    const raw = safeGetStorage(LOCAL_ACTIVITIES_KEY);
    const list: LeadActivity[] = raw ? JSON.parse(raw) : [];
    return leadId ? list.filter((a) => a.leadId === leadId) : list;
  } catch {
    return [];
  }
}

export async function recordLeadActivityInDb(
  activity: Omit<LeadActivity, 'id' | 'timestamp'>
): Promise<LeadActivity> {
  const actId = sanitizeId(`act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const payload: LeadActivity = {
    ...activity,
    id: actId,
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    const current = JSON.parse(safeGetStorage(LOCAL_ACTIVITIES_KEY) || '[]');
    safeSetStorage(LOCAL_ACTIVITIES_KEY, JSON.stringify([payload, ...current]));
  }

  notifyDataUpdated();
  return payload;
}

// ----------------------------------------------------
// Commercial Appointments & Calendar Persistence
// ----------------------------------------------------
const LOCAL_APPOINTMENTS_KEY = 'geolead_appointments_backup_v1';

export async function fetchAllAppointments(assignedTo?: string): Promise<CommercialAppointment[]> {
  try {
    const url = assignedTo && assignedTo !== 'all'
      ? `/api/appointments?assignedTo=${encodeURIComponent(assignedTo)}`
      : '/api/appointments';
    const res = await fetch(url);
    if (res.ok) {
      return (await res.json()) as CommercialAppointment[];
    }
  } catch {
    // fallback
  }
  try {
    const raw = safeGetStorage(LOCAL_APPOINTMENTS_KEY);
    const list: CommercialAppointment[] = raw ? JSON.parse(raw) : [];
    return assignedTo && assignedTo !== 'all'
      ? list.filter((a) => a.assignedTo === assignedTo)
      : list;
  } catch {
    return [];
  }
}

export async function createAppointmentInDb(
  appt: Omit<CommercialAppointment, 'id' | 'createdAt'>
): Promise<CommercialAppointment> {
  const apptId = sanitizeId(`appt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const payload: CommercialAppointment = {
    ...appt,
    id: apptId,
    status: appt.status || 'pendente',
    createdAt: new Date().toISOString(),
  };

  try {
    await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    const current = JSON.parse(safeGetStorage(LOCAL_APPOINTMENTS_KEY) || '[]');
    safeSetStorage(LOCAL_APPOINTMENTS_KEY, JSON.stringify([payload, ...current]));
  }

  // Also log an activity on the lead if associated
  if (payload.leadId) {
    recordLeadActivityInDb({
      leadId: payload.leadId,
      type: 'note_added',
      title: `Compromisso Agendado: ${payload.title}`,
      description: `Agendado para ${payload.date} às ${payload.time} (${payload.type}) por ${payload.assignedToName}`,
      authorName: payload.assignedToName,
    }).catch(() => {});
  }

  notifyDataUpdated();
  return payload;
}

export async function updateAppointmentInDb(
  apptId: string,
  updates: Partial<CommercialAppointment>
): Promise<void> {
  const cleanId = sanitizeId(apptId);
  try {
    await fetch(`/api/appointments/${cleanId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  } catch {
    // Ignore network glitch
  }
  notifyDataUpdated();
}

export async function deleteAppointmentFromDb(apptId: string): Promise<void> {
  const cleanId = sanitizeId(apptId);
  try {
    await fetch(`/api/appointments/${cleanId}`, {
      method: 'DELETE',
    });
  } catch {
    // Ignore network glitch
  }
  notifyDataUpdated();
}

