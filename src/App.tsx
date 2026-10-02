import React, { useState, useEffect, useCallback } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import {
  Lock,
  User as UserIcon,
  KeyRound,
  ArrowRight,
  Moon,
  Sun,
  Sparkles,
  Send,
  BookOpen,
} from 'lucide-react';
import {
  AppUserSession,
  getSavedUserSession,
  loginWithCredentials,
  signOutUser,
  fetchAllCrmData,
  createLeadInDb,
  updateLeadInDb,
  deleteLeadFromDb,
  createDispatchLogInDb,
  updateDispatchStatusInDb,
  recordLeadActivityInDb,
  safeGetStorage,
  safeSetStorage,
} from './firebase';
import {
  Lead,
  DispatchLog,
  DiscoveredPlace,
  CnpjLookupResult,
  TEAM_EMPLOYEES,
  getLeadFollowUpAlert,
  LOST_REASONS,
  LostReasonKey,
} from './types';
import { MapProspector } from './components/MapProspector';
import { CnpjConsultantModal } from './components/CnpjConsultantModal';
import {
  ProposalBotModal,
  formatWhatsAppDeepLink,
} from './components/ProposalBotModal';
import { SpreadsheetView } from './components/SpreadsheetView';
import { ControlPanelView } from './components/ControlPanelView';
import { LeadHistoryModal } from './components/LeadHistoryModal';
import { CommercialCalendarView } from './components/CommercialCalendarView';
import { PlaybookModal } from './components/PlaybookModal';
import { LeadBriefingModal } from './components/LeadBriefingModal';
import { LostReasonModal } from './components/LostReasonModal';
import { EmployeeDailyWorkspace } from './components/EmployeeDailyWorkspace';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export default function App() {
  const [user, setUser] = useState<AppUserSession | null>(() =>
    getSavedUserSession()
  );
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = safeGetStorage('geolead_theme_mode');
    return saved ? saved === 'dark' : true;
  });
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin' || user?.username === 'vendas';

  const [activeTab, setActiveTab] = useState<
    'radar' | 'spreadsheet' | 'funnel' | 'calendar' | 'dispatches'
  >(() => (isAdmin ? 'radar' : 'spreadsheet'));

  const [leads, setLeads] = useState<Lead[]>([]);
  const [dispatches, setDispatches] = useState<DispatchLog[]>([]);
  const [groqConfigured, setGroqConfigured] = useState<boolean>(false);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState<boolean>(false);

  // Modals State
  const [cnpjModalOpen, setCnpjModalOpen] = useState<boolean>(false);
  const [cnpjTargetPlace, setCnpjTargetPlace] =
    useState<DiscoveredPlace | null>(null);
  const [cnpjTargetLead, setCnpjTargetLead] = useState<Lead | null>(null);

  const [proposalModalOpen, setProposalModalOpen] = useState<boolean>(false);
  const [proposalTargetLead, setProposalTargetLead] = useState<Lead | null>(
    null
  );
  const [batchGenerating, setBatchGenerating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state: History, Calendar, Playbook, Briefing, Lost Reason
  const [historyModalOpen, setHistoryModalOpen] = useState<boolean>(false);
  const [historyTargetLead, setHistoryTargetLead] = useState<Lead | null>(null);
  const [calendarPreselectedLead, setCalendarPreselectedLead] =
    useState<Lead | null>(null);

  const [playbookModalOpen, setPlaybookModalOpen] = useState<boolean>(false);
  const [playbookTargetLead, setPlaybookTargetLead] = useState<Lead | null>(null);

  const [briefingModalOpen, setBriefingModalOpen] = useState<boolean>(false);
  const [briefingTargetLead, setBriefingTargetLead] = useState<Lead | null>(null);

  const [lostModalOpen, setLostModalOpen] = useState<boolean>(false);
  const [lostTargetLead, setLostTargetLead] = useState<Lead | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  const handleConfirmLost = async (
    leadId: string,
    reasonKey: LostReasonKey,
    notes: string
  ) => {
    await updateLeadInDb(leadId, {
      funnelStage: 'perdido',
      lostReason: reasonKey,
      lostNotes: notes,
    });
    const target = leads.find((l) => l.id === leadId);
    const reasonLabel = LOST_REASONS[reasonKey]?.label || reasonKey;
    try {
      await recordLeadActivityInDb({
        leadId,
        authorName: user?.displayName || 'Consultor',
        type: 'stage_changed',
        title: `Lead Arquivado / Perdido: ${reasonLabel}`,
        description: notes
          ? `Motivo: ${reasonLabel}. Observações da equipe: ${notes}`
          : `Motivo: ${reasonLabel}`,
      });
    } catch {
      // Ignore
    }
    showToast(
      `Lead "${target?.companyName || ''}" registrado como Perdido (${reasonLabel}).`
    );
  };

  // Ensure employees only stay on allowed views ('spreadsheet', 'funnel', 'calendar')
  useEffect(() => {
    if (user && !isAdmin) {
      if (
        activeTab !== 'spreadsheet' &&
        activeTab !== 'funnel' &&
        activeTab !== 'calendar'
      ) {
        setActiveTab('spreadsheet');
      }
    }
  }, [user, isAdmin, activeTab]);

  useEffect(() => {
    try {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        safeSetStorage('geolead_theme_mode', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        safeSetStorage('geolead_theme_mode', 'light');
      }
    } catch {
      // Ignore DOM/storage restriction on mobile
    }
  }, [darkMode]);

  // Listen for Google Maps Demo Key Quota Exhaustion Event
  useEffect(() => {
    const handleQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Check Groq API Key status from backend
  useEffect(() => {
    fetch('/api/config-status')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.groqConfigured === 'boolean') {
          setGroqConfigured(data.groqConfigured);
        }
      })
      .catch(() => {});
  }, []);

  const refreshCrmData = useCallback(async () => {
    if (!user) {
      setLeads([]);
      setDispatches([]);
      return;
    }
    const data = await fetchAllCrmData();
    setLeads(data.leads);
    setDispatches(data.dispatches);
  }, [user]);

  useEffect(() => {
    refreshCrmData();
    const handler = () => refreshCrmData();
    window.addEventListener('geolead-data-updated', handler);
    return () => window.removeEventListener('geolead-data-updated', handler);
  }, [refreshCrmData]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoginLoading(true);
    try {
      const session = await loginWithCredentials(usernameInput, passwordInput);
      setUser(session);
      setUsernameInput('');
      setPasswordInput('');
      if (session.role === 'employee') {
        setActiveTab('spreadsheet');
      } else {
        setActiveTab('radar');
      }
      showToast(`Bem-vindo(a), ${session.displayName}!`);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Usuário ou senha incorretos. Verifique suas credenciais de acesso.'
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    signOutUser();
    setUser(null);
    setUsernameInput('');
    setPasswordInput('');
  };

  // Save a discovered Google Maps place as a Lead (with automatic CNPJ & optional Employee Assignment)
  const handleSavePlaceAsLead = async (
    place: DiscoveredPlace,
    assignedToUsername?: string
  ): Promise<Lead | null> => {
    if (!user) return null;

    const empMeta = assignedToUsername
      ? TEAM_EMPLOYEES.find((e) => e.username === assignedToUsername)
      : undefined;

    const existing = leads.find(
      (l) => l.googlePlaceId === place.placeId || l.id === place.placeId
    );
    if (existing) {
      if (assignedToUsername) {
        await updateLeadInDb(existing.id, {
          assignedTo: assignedToUsername,
          assignedToName: empMeta ? empMeta.displayName : assignedToUsername,
        });
        showToast(
          `Empresa "${place.companyName}" enviada para ${
            empMeta ? empMeta.displayName : assignedToUsername
          } entrar em contato!`
        );
        return {
          ...existing,
          assignedTo: assignedToUsername,
          assignedToName: empMeta ? empMeta.displayName : assignedToUsername,
        };
      }
      return existing;
    }

    let autoCnpj: Partial<CnpjLookupResult> = {};
    try {
      const cnpjRes = await fetch('/api/cnpj/auto-discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: place.companyName,
          address: place.address,
          city: place.city,
          niche: place.niche,
          phone: place.phone,
        }),
      });
      if (cnpjRes.ok) {
        autoCnpj = await cnpjRes.json();
      }
    } catch {
      // Proceed with basic place info if offline
    }

    const assignedUser =
      assignedToUsername || (user.role === 'employee' ? user.username : '');
    const assignedName = empMeta
      ? empMeta.displayName
      : user.role === 'employee'
      ? user.displayName
      : '';

    const newId = await createLeadInDb(user.uid, {
      id: place.placeId,
      googlePlaceId: place.placeId,
      assignedTo: assignedUser,
      assignedToName: assignedName,
      companyName: place.companyName,
      tradeName: autoCnpj.razaoSocial || place.companyName,
      cnpj: autoCnpj.cnpj || '',
      niche: autoCnpj.cnaePrincipal || place.niche,
      address: place.address,
      city: place.city || autoCnpj.municipio || '',
      phone: place.phone || autoCnpj.telefone || '',
      email: autoCnpj.email || '',
      responsibleName: autoCnpj.responsavelSugerido || '',
      websiteUrl: place.websiteUrl,
      websiteStatus: place.websiteStatus,
      rating: place.rating,
      userRatingCount: place.userRatingCount,
      lat: place.lat,
      lng: place.lng,
      funnelStage: autoCnpj.cnpj ? 'enriquecido' : 'extraido',
      proposalValue: 1490,
    });

    if (assignedUser) {
      showToast(
        `"${place.companyName}" enviada para ${
          assignedName || assignedUser
        } entrar em contato!`
      );
    } else {
      showToast(
        `"${place.companyName}" salva com CNPJ ${autoCnpj.cnpj || ''} na Planilha!`
      );
    }

    return {
      id: newId,
      ownerId: user.uid,
      assignedTo: assignedUser,
      assignedToName: assignedName,
      companyName: place.companyName,
      tradeName: autoCnpj.razaoSocial || place.companyName,
      cnpj: autoCnpj.cnpj || '',
      niche: autoCnpj.cnaePrincipal || place.niche,
      address: place.address,
      city: place.city || autoCnpj.municipio || '',
      phone: place.phone || autoCnpj.telefone || '',
      email: autoCnpj.email || '',
      responsibleName: autoCnpj.responsavelSugerido || '',
      websiteUrl: place.websiteUrl,
      websiteStatus: place.websiteStatus,
      googlePlaceId: place.placeId,
      rating: place.rating,
      userRatingCount: place.userRatingCount,
      lat: place.lat,
      lng: place.lng,
      funnelStage: autoCnpj.cnpj ? 'enriquecido' : 'extraido',
      proposalValue: 1490,
    };
  };

  const handleSaveBatchPlaces = async (
    places: DiscoveredPlace[],
    distributeToTeam = false
  ) => {
    if (!user) return;
    for (let i = 0; i < places.length; i++) {
      const p = places[i];
      const assignedEmp = distributeToTeam
        ? TEAM_EMPLOYEES[i % TEAM_EMPLOYEES.length].username
        : undefined;
      await handleSavePlaceAsLead(p, assignedEmp);
    }
    if (distributeToTeam) {
      showToast(
        `${places.length} empresas distribuídas entre os funcionários!`
      );
    } else {
      showToast(
        `${places.length} empresas adicionadas com CNPJ automático na planilha!`
      );
    }
  };

  const handleDistributeExistingLeadsToTeam = async () => {
    if (!isAdmin || leads.length === 0) return;
    const unassigned = leads.filter((l) => !l.assignedTo);
    const targetList = unassigned.length > 0 ? unassigned : leads;

    for (let i = 0; i < targetList.length; i++) {
      const lead = targetList[i];
      const emp = TEAM_EMPLOYEES[i % TEAM_EMPLOYEES.length];
      await updateLeadInDb(lead.id, {
        assignedTo: emp.username,
        assignedToName: emp.displayName,
      });
    }

    showToast(
      `${targetList.length} leads distribuídos automaticamente para a equipe!`
    );
  };

  const handleApplyCnpjToFunnel = async (
    cnpjData: CnpjLookupResult,
    targetPlace?: DiscoveredPlace | null,
    targetLead?: Lead | null
  ) => {
    if (!user) return;

    if (targetLead) {
      await updateLeadInDb(targetLead.id, {
        cnpj: cnpjData.cnpj,
        tradeName: cnpjData.nomeFantasia || cnpjData.razaoSocial,
        niche: cnpjData.cnaePrincipal || targetLead.niche,
        responsibleName:
          cnpjData.responsavelSugerido || targetLead.responsibleName || '',
        phone: targetLead.phone || cnpjData.telefone || '',
        email: targetLead.email || cnpjData.email || '',
        address: targetLead.address || cnpjData.endereco,
        city: targetLead.city || cnpjData.municipio,
        funnelStage:
          targetLead.funnelStage === 'extraido'
            ? 'enriquecido'
            : targetLead.funnelStage,
        notes: `Razão Social: ${cnpjData.razaoSocial} | Porte: ${
          cnpjData.porte
        } | QSA: ${cnpjData.quadroSocietario.join(', ')}`.slice(0, 1900),
      });
      showToast(`Dados do CNPJ ${cnpjData.cnpj} vinculados ao lead!`);
      return;
    }

    if (targetPlace) {
      await createLeadInDb(user.uid, {
        id: targetPlace.placeId,
        googlePlaceId: targetPlace.placeId,
        assignedTo: user.role === 'employee' ? user.username : '',
        assignedToName: user.role === 'employee' ? user.displayName : '',
        companyName: targetPlace.companyName,
        tradeName: cnpjData.nomeFantasia || cnpjData.razaoSocial,
        cnpj: cnpjData.cnpj,
        niche: cnpjData.cnaePrincipal || targetPlace.niche,
        address: targetPlace.address || cnpjData.endereco,
        city: targetPlace.city || cnpjData.municipio,
        phone: targetPlace.phone || cnpjData.telefone,
        email: cnpjData.email,
        responsibleName: cnpjData.responsavelSugerido,
        websiteStatus: targetPlace.websiteStatus,
        websiteUrl: targetPlace.websiteUrl,
        rating: targetPlace.rating,
        userRatingCount: targetPlace.userRatingCount,
        lat: targetPlace.lat,
        lng: targetPlace.lng,
        funnelStage: 'enriquecido',
        proposalValue: 1490,
        notes: `Razão Social: ${cnpjData.razaoSocial} | QSA: ${cnpjData.quadroSocietario.join(
          ', '
        )}`.slice(0, 1900),
      });
      showToast(
        `Empresa "${targetPlace.companyName}" enriquecida com CNPJ e salva na planilha!`
      );
      return;
    }

    const cleanCnpjId = `cnpj_${cnpjData.cnpj.replace(/\D/g, '')}`;
    await createLeadInDb(user.uid, {
      id: cleanCnpjId,
      assignedTo: user.role === 'employee' ? user.username : '',
      assignedToName: user.role === 'employee' ? user.displayName : '',
      companyName: cnpjData.nomeFantasia || cnpjData.razaoSocial,
      tradeName: cnpjData.razaoSocial,
      cnpj: cnpjData.cnpj,
      niche: cnpjData.cnaePrincipal,
      address: cnpjData.endereco || 'Endereço Fiscal Receita Federal',
      city: cnpjData.municipio,
      phone: cnpjData.telefone,
      email: cnpjData.email,
      responsibleName: cnpjData.responsavelSugerido,
      websiteStatus: 'no_website',
      funnelStage: 'enriquecido',
      proposalValue: 1490,
      notes: `Importado via Consultor de CNPJ | Capital Social: R$ ${
        cnpjData.capitalSocial
      } | QSA: ${cnpjData.quadroSocietario.join(', ')}`.slice(0, 1900),
    });
    showToast(`CNPJ ${cnpjData.cnpj} importado como novo lead no funil!`);
  };

  const handleOpenProposalForPlace = async (place: DiscoveredPlace) => {
    const savedLead = await handleSavePlaceAsLead(place);
    if (savedLead) {
      setProposalTargetLead(savedLead);
      setProposalModalOpen(true);
    }
  };

  const handleSaveProposalFromModal = async (
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
  ) => {
    const target = leads.find((l) => l.id === leadId);
    const nextStage =
      target &&
      (target.funnelStage === 'extraido' ||
        target.funnelStage === 'enriquecido')
        ? 'proposta_gerada'
        : target?.funnelStage || 'proposta_gerada';

    await updateLeadInDb(leadId, {
      ...updates,
      funnelStage: nextStage,
    });
  };

  const handleRecordDispatch = async (
    lead: Lead,
    channel: 'whatsapp' | 'email',
    messagePreview: string,
    aiModelUsed: string
  ) => {
    if (!user) return;
    await createDispatchLogInDb(user.uid, {
      leadId: lead.id,
      dispatchedBy: user.username,
      dispatchedByName: user.displayName,
      companyName: lead.companyName,
      recipientName: lead.responsibleName || 'Responsável',
      recipientContact:
        channel === 'whatsapp'
          ? lead.phone || 'WhatsApp Comercial'
          : lead.email || 'E-mail Comercial',
      niche: lead.niche,
      channel,
      status: 'enviado',
      messagePreview,
      aiModelUsed,
    });

    await updateLeadInDb(lead.id, {
      funnelStage: 'proposta_enviada',
      lastDispatchChannel: channel,
      lastDispatchStatus: 'enviado',
    });
  };

  const handleQuickDispatch = async (
    lead: Lead,
    channel: 'whatsapp' | 'email'
  ) => {
    const preview =
      channel === 'whatsapp'
        ? lead.proposalWhatsapp ||
          `Proposta Off-Page enviada via WhatsApp para ${lead.companyName}`
        : lead.proposalEmailBody ||
          `Proposta Off-Page enviada por E-mail para ${lead.companyName}`;

    await handleRecordDispatch(lead, channel, preview, 'Groq Bot');
    showToast(
      `Envio via ${
        channel === 'whatsapp' ? 'WhatsApp' : 'E-mail'
      } registrado com sucesso!`
    );
  };

  const handleBatchGenerateProposals = async () => {
    const targetPool = isAdmin
      ? leads
      : leads.filter((l) => l.assignedTo === user?.username);
    const pending = targetPool.filter(
      (l) => !l.proposalWhatsapp || l.proposalWhatsapp.trim() === ''
    );
    if (pending.length === 0) return;

    setBatchGenerating(true);
    try {
      for (const lead of pending) {
        const res = await fetch('/api/generate-proposal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: lead.companyName,
            tradeName: lead.tradeName,
            cnpj: lead.cnpj,
            niche: lead.niche,
            address: lead.address,
            city: lead.city,
            responsibleName: lead.responsibleName,
            websiteStatus: lead.websiteStatus,
            websiteUrl: lead.websiteUrl,
            rating: lead.rating,
            userRatingCount: lead.userRatingCount,
            proposalValue: lead.proposalValue || 1490,
            deliveryDays: 5,
            consultantName: user?.displayName || 'Consultor Vendas',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          await updateLeadInDb(lead.id, {
            proposalWhatsapp: data.whatsappMessage || '',
            proposalEmailSubject: data.emailSubject || '',
            proposalEmailBody: data.emailBody || '',
            funnelStage:
              lead.funnelStage === 'extraido' ||
              lead.funnelStage === 'enriquecido'
                ? 'proposta_gerada'
                : lead.funnelStage,
          });
        }
      }
      showToast(
        `${pending.length} propostas personalizadas geradas pelo Bot com sucesso!`
      );
    } finally {
      setBatchGenerating(false);
    }
  };

  // Strict data isolation: employees only receive leads assigned specifically to their username
  const myAssignedLeads = user
    ? leads.filter((l) => l.assignedTo === user.username)
    : [];
  const scopedLeads = isAdmin ? leads : myAssignedLeads;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Mandatory Demo Key Quota Exceeded Banner */}
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Strict 3-Zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab(isAdmin ? 'radar' : 'spreadsheet');
          }}
          className="flex items-center gap-3 group cursor-pointer"
        >
          <img
            src="/src/assets/images/otter_minimal_logo_1790960508704.jpg"
            alt="Afenko Logo"
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-xl object-contain shadow-md border border-slate-700/50 bg-[#070d19] p-0.5 shrink-0"
          />
          <div className="leading-tight">
            <span className="text-base font-bold tracking-tight text-slate-900 block">
              Afenko
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-600 block">
              Soluções Off-Page
            </span>
          </div>
        </a>

        {/* Zone 2: Navigation links scoped by role */}
        {user && (
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {isAdmin && (
              <a
                href="#radar"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('radar');
                }}
                className={`transition-colors whitespace-nowrap py-1 ${
                  activeTab === 'radar'
                    ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-blue-600'
                    : 'hover:text-slate-900'
                }`}
              >
                Radar Maps & CNPJ
              </a>
            )}
            <a
              href="#planilha"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('spreadsheet');
              }}
              className={`transition-colors whitespace-nowrap py-1 ${
                activeTab === 'spreadsheet'
                  ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-blue-600'
                  : 'hover:text-slate-900'
              }`}
            >
              {isAdmin
                ? `Planilha (${leads.length})`
                : `Minha Planilha (${myAssignedLeads.length})`}
            </a>
            <a
              href="#funil"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('funnel');
              }}
              className={`transition-colors whitespace-nowrap py-1 ${
                activeTab === 'funnel'
                  ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-blue-600'
                  : 'hover:text-slate-900'
              }`}
            >
              {isAdmin ? 'Funil & Indicadores' : 'Meu Funil de Vendas'}
            </a>
            <a
              href="#agenda"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('calendar');
              }}
              className={`transition-colors whitespace-nowrap py-1 ${
                activeTab === 'calendar'
                  ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-blue-600'
                  : 'hover:text-slate-900'
              }`}
            >
              {isAdmin ? 'Agenda Comercial' : 'Minha Agenda'}
            </a>
            {isAdmin && (
              <a
                href="#envios"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab('dispatches');
                }}
                className={`transition-colors whitespace-nowrap py-1 ${
                  activeTab === 'dispatches'
                    ? 'text-slate-900 underline underline-offset-8 decoration-2 decoration-blue-600'
                    : 'hover:text-slate-900'
                }`}
              >
                Envios ({dispatches.length})
              </a>
            )}
          </nav>
        )}

        {/* Zone 3: Primary actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            title={
              darkMode
                ? 'Alternar para Modo Claro'
                : 'Alternar para Modo Noturno'
            }
            className="px-2.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            {darkMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span className="hidden sm:inline">Modo Noturno</span>
              </>
            )}
          </button>

          {user ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setPlaybookTargetLead(null);
                  setPlaybookModalOpen(true);
                }}
                className="px-2.5 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap"
                title="Playbook Comercial & Quebra de Objeções"
              >
                <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden sm:inline">Playbook</span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setCnpjTargetPlace(null);
                    setCnpjTargetLead(null);
                    setCnpjModalOpen(true);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  Consultar CNPJ
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
              >
                Sair
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-500 whitespace-nowrap hidden sm:inline">
              Acesso Restrito
            </span>
          )}
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium max-w-md">
          {toastMessage}
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6">
        {!user ? (
          /* Confidential Login Screen (No credential hints or quick-login buttons) */
          <div className="max-w-4xl mx-auto py-6 md:py-12">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
              {/* Left Column: Brand & Feature Summary (7 cols) */}
              <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <img
                      src="/src/assets/images/otter_minimal_logo_1790960508704.jpg"
                      alt="Afenko Logo"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-contain shadow-lg border border-slate-700/50 bg-[#070d19] p-0.5 shrink-0"
                    />
                    <div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span className="font-bold text-blue-600 tracking-wider uppercase text-[10px]">
                          Afenko
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Ambiente Seguro</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">
                        Soluções Off-Page
                      </span>
                    </div>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
                    Afenko — Soluções Off-Page
                  </h1>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Sistema comercial para prospecção geolocalizada via Google Maps, identificação de empresas com alto potencial, consulta cadastral de CNPJ e fechamento de soluções digitais.
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100 text-xs">
                  <div>
                    <strong className="text-slate-900 block">
                      01. Mapeamento Regional & Consulta de CNPJ
                    </strong>
                    <span className="text-slate-500">
                      Identificação de negócios locais com oportunidades de
                      posicionamento digital Off-Page.
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-900 block">
                      02. Bot de Propostas Comerciais por Nicho
                    </strong>
                    <span className="text-slate-500">
                      Abordagens personalizadas para envio direto via WhatsApp e
                      E-mail.
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-900 block">
                      03. Planilha Individual & Funil de Vendas Protegido
                    </strong>
                    <span className="text-slate-500">
                      Acesso restrito e individualizado para cada membro da equipe
                      comercial.
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Confidential Login Form (5 cols) */}
              <div className="md:col-span-5 p-6 sm:p-8 bg-slate-50/50 flex flex-col justify-center">
                <div className="flex items-center gap-3.5 mb-6">
                  <img
                    src="/src/assets/images/otter_minimal_logo_1790960508704.jpg"
                    alt="Afenko Logo"
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-xl object-contain shadow-md border border-slate-700/50 bg-[#070d19] p-0.5 shrink-0"
                  />
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Acesso ao Sistema
                    </h2>
                    <p className="text-xs text-slate-500">
                      Insira suas credenciais corporativas
                    </p>
                  </div>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nome de Usuário
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="Digite seu usuário"
                        required
                        autoComplete="username"
                        className="w-full h-11 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Senha de Acesso
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                        className="w-full h-11 pl-9 pr-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {authError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
                      {authError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full h-11 px-5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                  >
                    <Lock className="w-4 h-4" />
                    <span>
                      {loginLoading ? 'Autenticando...' : 'Entrar no Sistema'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          /* Authenticated Workspace */
          <div className="space-y-6">
            {/* Contextual Workspace Subheader */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-blue-700">
                    Usuário: {user.displayName}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">
                    E-mail Envio: contactevelynfernandes@gmail.com
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">WhatsApp: (11) 97888-1952</span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                  {isAdmin &&
                    activeTab === 'radar' &&
                    'Radar Geolocalizado de Empresas Sem Site & Envio de Leads p/ Funcionários'}
                  {activeTab === 'spreadsheet' &&
                    (isAdmin
                      ? 'Planilha Organizada de Contatos & Atribuição de Funcionários'
                      : 'Minha Planilha de Contatos Designados')}
                  {activeTab === 'funnel' &&
                    (isAdmin
                      ? 'Funil de Vendas, Indicadores da Equipe & Follow-up'
                      : 'Meu Funil de Vendas Individual')}
                  {activeTab === 'calendar' &&
                    (isAdmin
                      ? 'Agenda Comercial & Calendário de Retornos da Equipe'
                      : 'Minha Agenda Comercial & Tarefas Pendentes')}
                  {isAdmin &&
                    activeTab === 'dispatches' &&
                    'Painel de Controle e Monitoramento de Envios'}
                </h1>
              </div>
            </div>

            {/* Mobile Navigation Switcher (Scoped by Role) */}
            <div className="flex md:hidden items-center gap-1 p-1 bg-slate-200 rounded-lg">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setActiveTab('radar')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded ${
                    activeTab === 'radar'
                      ? 'bg-white text-slate-900'
                      : 'text-slate-600'
                  }`}
                >
                  Mapa
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('spreadsheet')}
                className={`flex-1 py-1.5 text-xs font-medium rounded ${
                  activeTab === 'spreadsheet'
                    ? 'bg-white text-slate-900'
                    : 'text-slate-600'
                }`}
              >
                {isAdmin
                  ? `Planilha (${leads.length})`
                  : `Planilha (${myAssignedLeads.length})`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('funnel')}
                className={`flex-1 py-1.5 text-xs font-medium rounded ${
                  activeTab === 'funnel'
                    ? 'bg-white text-slate-900'
                    : 'text-slate-600'
                }`}
              >
                Funil
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={`flex-1 py-1.5 text-xs font-medium rounded ${
                  activeTab === 'calendar'
                    ? 'bg-white text-slate-900'
                    : 'text-slate-600'
                }`}
              >
                Agenda
              </button>
            </div>

            {/* Employee Daily Workspace: Mural, Metas & Comissões, Checklist Diário */}
            {!isAdmin && (
              <EmployeeDailyWorkspace
                currentUsername={user.username}
                currentDisplayName={user.displayName}
                isAdmin={isAdmin}
                myLeads={myAssignedLeads}
                onOpenPlaybook={() => {
                  setPlaybookTargetLead(null);
                  setPlaybookModalOpen(true);
                }}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {/* Employee Assigned Leads Queue Banner (when logged in as funcionário01, funcionário02, or funcionário03) */}
            {!isAdmin && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Seus Contatos Designados ({myAssignedLeads.length}{' '}
                      empresas)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Empresas enviadas pela gestão para você entrar em contato via
                      WhatsApp ou E-mail.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('spreadsheet')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        activeTab === 'spreadsheet'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Minha Planilha
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('funnel')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        activeTab === 'funnel'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Meu Funil de Vendas
                    </button>
                  </div>
                </div>

                {myAssignedLeads.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-500">
                    Nenhum contato foi enviado para a sua planilha ainda. Aguarde a
                    distribuição de novos leads pela gestão.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {myAssignedLeads.map((lead) => {
                      const waUrl = formatWhatsAppDeepLink(
                        lead.phone || '',
                        lead.proposalWhatsapp ||
                          `Olá ${
                            lead.responsibleName || lead.companyName
                          }, tudo bem? Aqui é da equipe de Evelyn Fernandes. Preparamos uma proposta comercial de Landing Page Off-Page para a ${
                            lead.companyName
                          }. Podemos conversar?`
                      );
                      return (
                        <div
                          key={lead.id}
                          className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="truncate">{lead.niche}</span>
                            <span className="font-mono text-emerald-700 font-semibold">
                              Seu Lead
                            </span>
                          </div>
                          <div className="text-sm font-bold text-slate-900 truncate">
                            {lead.companyName}
                          </div>
                          <div className="text-xs font-mono text-slate-600">
                            CNPJ: {lead.cnpj || 'Consultado'} · Tel:{' '}
                            {lead.phone || 'No Maps'}
                          </div>
                          <div className="pt-1 flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setBriefingTargetLead(lead);
                                setBriefingModalOpen(true);
                              }}
                              className="px-2 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded flex items-center gap-1"
                              title="Ficha Pré-Ligação / Briefing Rápido"
                            >
                              <span>Ficha</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setProposalTargetLead(lead);
                                setProposalModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Proposta Bot</span>
                            </button>
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleQuickDispatch(lead, 'whatsapp')}
                              className="px-2.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Active View Content */}
            {isAdmin && activeTab === 'radar' && (
              <APIProvider
                apiKey={MAPS_API_KEY}
                language="pt-BR"
                region="BR"
                libraries={['places', 'marker']}
              >
                <MapProspector
                  existingLeads={leads}
                  darkMode={darkMode}
                  isAdmin={isAdmin}
                  onSavePlaceAsLead={async (place, assignedTo) => {
                    await handleSavePlaceAsLead(place, assignedTo);
                  }}
                  onSaveBatchPlaces={handleSaveBatchPlaces}
                  onOpenCnpjModalForPlace={(place) => {
                    setCnpjTargetPlace(place);
                    setCnpjTargetLead(null);
                    setCnpjModalOpen(true);
                  }}
                  onGenerateProposalForPlace={handleOpenProposalForPlace}
                />
              </APIProvider>
            )}

            {activeTab === 'spreadsheet' && (
              <SpreadsheetView
                leads={scopedLeads}
                currentUsername={user.username}
                isAdmin={isAdmin}
                onUpdateLead={async (leadId, updates) => {
                  await updateLeadInDb(leadId, updates);
                  if (updates.assignedTo) {
                    const targetLead = leads.find((l) => l.id === leadId);
                    showToast(
                      `Lead "${
                        targetLead?.companyName || ''
                      }" enviado para ${updates.assignedTo} entrar em contato!`
                    );
                  }
                }}
                onDeleteLead={deleteLeadFromDb}
                onOpenProposalModal={(lead) => {
                  setProposalTargetLead(lead);
                  setProposalModalOpen(true);
                }}
                onOpenCnpjModal={(lead) => {
                  setCnpjTargetLead(lead);
                  setCnpjTargetPlace(null);
                  setCnpjModalOpen(true);
                }}
                onOpenNewLeadModal={() => {
                  setCnpjTargetLead(null);
                  setCnpjTargetPlace(null);
                  setCnpjModalOpen(true);
                }}
                onQuickDispatch={handleQuickDispatch}
                onDistributeLeadsToTeam={
                  isAdmin ? handleDistributeExistingLeadsToTeam : undefined
                }
                onOpenLeadHistory={(lead) => {
                  setHistoryTargetLead(lead);
                  setHistoryModalOpen(true);
                }}
                onOpenScheduleAppointment={(lead) => {
                  setCalendarPreselectedLead(lead);
                  setActiveTab('calendar');
                }}
                onOpenBriefing={(lead) => {
                  setBriefingTargetLead(lead);
                  setBriefingModalOpen(true);
                }}
                onOpenLostModal={(lead) => {
                  setLostTargetLead(lead);
                  setLostModalOpen(true);
                }}
                onOpenPlaybook={(lead) => {
                  setPlaybookTargetLead(lead);
                  setPlaybookModalOpen(true);
                }}
              />
            )}

            {activeTab === 'calendar' && (
              <CommercialCalendarView
                currentUsername={user.username}
                currentDisplayName={user.displayName}
                isAdmin={isAdmin}
                leads={scopedLeads}
                preselectedLead={calendarPreselectedLead}
                onOpenLeadHistory={(lead) => {
                  setHistoryTargetLead(lead);
                  setHistoryModalOpen(true);
                }}
              />
            )}

            {(activeTab === 'funnel' || (isAdmin && activeTab === 'dispatches')) && (
              <ControlPanelView
                leads={scopedLeads}
                dispatches={isAdmin ? dispatches : []}
                currentUsername={user.username}
                isAdmin={isAdmin}
                activeSubTab={
                  isAdmin && activeTab === 'dispatches' ? 'dispatches' : 'funnel'
                }
                setActiveSubTab={(sub) =>
                  setActiveTab(
                    isAdmin && sub === 'dispatches' ? 'dispatches' : 'funnel'
                  )
                }
                onUpdateLead={async (leadId, updates) => {
                  await updateLeadInDb(leadId, updates);
                  if (updates.assignedTo) {
                    const targetLead = leads.find((l) => l.id === leadId);
                    showToast(
                      `Lead "${
                        targetLead?.companyName || ''
                      }" enviado para ${updates.assignedTo} entrar em contato!`
                    );
                  }
                }}
                onUpdateDispatchStatus={updateDispatchStatusInDb}
                onOpenProposalModal={(lead) => {
                  setProposalTargetLead(lead);
                  setProposalModalOpen(true);
                }}
                onBatchGenerateProposals={handleBatchGenerateProposals}
                batchGenerating={batchGenerating}
                onDistributeLeadsToTeam={
                  isAdmin ? handleDistributeExistingLeadsToTeam : undefined
                }
                onOpenLeadHistory={(lead) => {
                  setHistoryTargetLead(lead);
                  setHistoryModalOpen(true);
                }}
                onOpenScheduleAppointment={(lead) => {
                  setCalendarPreselectedLead(lead);
                  setActiveTab('calendar');
                }}
                onQuickDispatch={handleQuickDispatch}
                onOpenBriefing={(lead) => {
                  setBriefingTargetLead(lead);
                  setBriefingModalOpen(true);
                }}
                onOpenLostModal={(lead) => {
                  setLostTargetLead(lead);
                  setLostModalOpen(true);
                }}
                onOpenPlaybook={(lead) => {
                  setPlaybookTargetLead(lead);
                  setPlaybookModalOpen(true);
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <CnpjConsultantModal
        isOpen={cnpjModalOpen}
        onClose={() => setCnpjModalOpen(false)}
        targetPlace={cnpjTargetPlace}
        targetLead={cnpjTargetLead}
        onApplyCnpjToFunnel={handleApplyCnpjToFunnel}
      />

      <ProposalBotModal
        isOpen={proposalModalOpen}
        onClose={() => setProposalModalOpen(false)}
        lead={proposalTargetLead}
        consultantName={user?.displayName || 'Consultor Vendas'}
        groqConfigured={groqConfigured}
        onSaveProposal={handleSaveProposalFromModal}
        onRecordDispatch={handleRecordDispatch}
      />

      <LeadHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        lead={historyTargetLead}
        currentUserName={user?.displayName || 'Consultor'}
        onOpenScheduleAppointment={(lead) => {
          setCalendarPreselectedLead(lead);
          setActiveTab('calendar');
        }}
        onQuickDispatch={handleQuickDispatch}
      />

      <PlaybookModal
        isOpen={playbookModalOpen}
        onClose={() => setPlaybookModalOpen(false)}
        selectedLead={playbookTargetLead}
        onQuickDispatch={handleQuickDispatch}
      />

      <LeadBriefingModal
        isOpen={briefingModalOpen}
        onClose={() => setBriefingModalOpen(false)}
        lead={briefingTargetLead}
        onOpenScheduleAppointment={(lead) => {
          setCalendarPreselectedLead(lead);
          setActiveTab('calendar');
        }}
        onOpenLeadHistory={(lead) => {
          setHistoryTargetLead(lead);
          setHistoryModalOpen(true);
        }}
        onOpenPlaybook={(lead) => {
          setPlaybookTargetLead(lead);
          setPlaybookModalOpen(true);
        }}
        onQuickDispatch={handleQuickDispatch}
        onOpenLostModal={(lead) => {
          setLostTargetLead(lead);
          setLostModalOpen(true);
        }}
        onUpdateStage={async (leadId, stage) => {
          await updateLeadInDb(leadId, { funnelStage: stage });
          showToast('Estágio do lead atualizado!');
        }}
      />

      <LostReasonModal
        isOpen={lostModalOpen}
        onClose={() => setLostModalOpen(false)}
        lead={lostTargetLead}
        onConfirmLost={handleConfirmLost}
      />
    </div>
  );
}
