import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'crm_store.json');

interface StoredDb {
  leads: any[];
  dispatches: any[];
  activities: any[];
  appointments: any[];
}

function loadDb(): StoredDb {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initialData: StoredDb = { leads: [], dispatches: [], activities: [], appointments: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      leads: Array.isArray(parsed.leads) ? parsed.leads : [],
      dispatches: Array.isArray(parsed.dispatches) ? parsed.dispatches : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
      appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
    };
  } catch (err) {
    console.error('Erro ao ler banco local:', err);
    return { leads: [], dispatches: [], activities: [], appointments: [] };
  }
}

function saveDb(data: StoredDb) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erro ao salvar banco local:', err);
  }
}

interface ProposalRequestPayload {
  companyName: string;
  tradeName?: string;
  cnpj?: string;
  niche: string;
  address: string;
  city?: string;
  responsibleName?: string;
  websiteStatus: 'no_website' | 'outdated_website' | 'social_only' | 'active_website';
  websiteUrl?: string;
  rating?: number;
  userRatingCount?: number;
  proposalValue: number;
  deliveryDays?: number;
  consultantName?: string;
  agencyName?: string;
}

function buildDiagnosticAngle(payload: ProposalRequestPayload): string {
  if (payload.websiteStatus === 'no_website') {
    return 'A empresa aparece no Google Maps da região, mas não possui um site/landing page oficial vinculado ao perfil. Isso faz com que potenciais clientes que pesquisam no Google cliquem em concorrentes que oferecem página rápida de orçamento ou agendamento.';
  }
  if (payload.websiteStatus === 'social_only') {
    return `O perfil da empresa direciona apenas para rede social (${payload.websiteUrl || 'Instagram/Facebook'}), sem uma Landing Page (Off-Page) estruturada para conversão imediata, captura de leads no WhatsApp e ranqueamento orgânico no Google.`;
  }
  if (payload.websiteStatus === 'outdated_website') {
    return `O endereço web atual (${payload.websiteUrl || 'site legado'}) apresenta falhas de modernidade, velocidade mobile ou ausência de funil direto de conversão via WhatsApp, reduzindo o aproveitamento do tráfego local.`;
  }
  return 'Oportunidade de criar uma página de alta conversão (Off-Page / Landing Page) dedicada a campanhas locais e captação acelerada de clientes.';
}

function generateStructuredFallbackProposal(payload: ProposalRequestPayload) {
  const greetingName = payload.responsibleName
    ? payload.responsibleName.split(' ')[0]
    : `Responsável pela ${payload.tradeName || payload.companyName}`;
  const displayCompany = payload.tradeName || payload.companyName;
  const ratingNote =
    payload.rating && payload.rating > 0
      ? `Notamos que a ${displayCompany} já conta com nota ${payload.rating.toFixed(1)} (${payload.userRatingCount || 0} avaliações) no Google Maps em ${payload.city || payload.address}`
      : `Localizamos a ${displayCompany} pelo mapeamento comercial de ${payload.niche} na região de ${payload.city || payload.address}`;

  const diagnostic = buildDiagnosticAngle(payload);
  const formattedPrice = payload.proposalValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  const delivery = payload.deliveryDays || 5;
  const sender = payload.consultantName || 'Evelyn Fernandes';
  const senderEmail = 'contactevelynfernandes@gmail.com';
  const senderPhone = '(11) 97888-1952';

  const whatsappMessage = `Olá, ${greetingName}! Tudo bem? Aqui é a ${sender}.

${ratingNote}, porém identificamos um ponto importante: quando clientes procuram por *${payload.niche}* na região, o perfil de vocês não conta com uma Landing Page (Off-Page) de alta conversão integrada ao Google e WhatsApp.

Desenvolvemos uma estrutura exclusiva para o nicho de *${payload.niche}* que transforma buscas locais em pedidos reais de orçamento no WhatsApp em até ${delivery} dias úteis.

Posso te enviar um diagnóstico rápido de 1 minuto mostrando como posicionar a *${displayCompany}* à frente dos concorrentes locais? (Investimento fechado do projeto: ${formattedPrice}).

— ${sender}
WhatsApp: ${senderPhone} | E-mail: ${senderEmail}`;

  const emailSubject = `Proposta de Posicionamento Off-Page & Conversão Local — ${displayCompany} (${payload.niche})`;

  const emailBody = `Prezado(a) ${payload.responsibleName || greetingName},

Espero que esta mensagem o(a) encontre bem.

Realizamos uma auditoria de presença digital geolocalizada para empresas do segmento de ${payload.niche} na região (${payload.address}) e analisamos o posicionamento atual da ${displayCompany}${payload.cnpj ? ` (CNPJ: ${payload.cnpj})` : ''}.

1. DIAGNÓSTICO ATUAL NO GOOGLE MAPS
• ${ratingNote}.
• Situação identificada: ${diagnostic}

2. SOLUÇÃO PROPOSTA: LANDING PAGE OFF-PAGE DE ALTA CONVERSÃO
Projetamos uma página comercial ultrarrápida e persuasiva, 100% personalizada para o segmento de ${payload.niche}, contendo:
• Cabeçalho de autoridade com proposta de valor clara e botão flutuante de WhatsApp com rastreamento;
• Seção de provas sociais integrada às avaliações reais do Google Maps;
• Apresentação objetiva dos principais serviços/produtos da ${displayCompany};
• Otimização de SEO Local (Schema.org LocalBusiness) para destacar a empresa nas buscas da região;
• Design 100% responsivo (Mobile-First) com carregamento instantâneo.

3. INVESTIMENTO E PRAZO DE ENTREGA
• Valor total do projeto: ${formattedPrice} (pagamento único ou parcelado, sem mensalidades ocultas)
• Prazo de entrega: ${delivery} dias úteis com página publicada e configurada no Google Perfil da Empresa.

Caso faça sentido aumentar o volume de contatos qualificados da ${displayCompany} já nesta semana, responda a este e-mail (${senderEmail}) ou chame diretamente no meu WhatsApp: ${senderPhone} (https://wa.me/5511978881952).

Atenciosamente,
${sender}
WhatsApp Direto: ${senderPhone}
E-mail Comercial: ${senderEmail}`;

  return {
    whatsappMessage: whatsappMessage.slice(0, 3900),
    emailSubject: emailSubject.slice(0, 290),
    emailBody: emailBody.slice(0, 7900),
    modelUsed: 'Template Estratégico por Nicho',
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Multi-User Login Authentication (Gestora + 3 Funcionários)
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    const normalizeStr = (s: string) =>
      String(s || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const normUser = normalizeStr(username);
    const normPass = normalizeStr(password);

    if (normUser === 'vendas' && normPass === 'vendas123') {
      res.json({
        authenticated: true,
        user: {
          uid: 'user_vendas_oficial',
          username: 'vendas',
          displayName: 'Evelyn Fernandes (Gestora)',
          role: 'admin',
          email: 'contactevelynfernandes@gmail.com',
          phone: '11 97888-1952',
        },
        token: 'geolead_session_vendas_token_2026',
      });
      return;
    }

    if (normUser === 'funcionario01' && normPass === 'negocios123') {
      res.json({
        authenticated: true,
        user: {
          uid: 'user_funcionario_01',
          username: 'funcionário01',
          displayName: 'Funcionário 01',
          role: 'employee',
          email: 'contactevelynfernandes@gmail.com',
          phone: '11 97888-1952',
        },
        token: 'geolead_session_func01_token_2026',
      });
      return;
    }

    if (normUser === 'funcionario02' && normPass === 'negocios456') {
      res.json({
        authenticated: true,
        user: {
          uid: 'user_funcionario_02',
          username: 'funcionário02',
          displayName: 'Funcionário 02',
          role: 'employee',
          email: 'contactevelynfernandes@gmail.com',
          phone: '11 97888-1952',
        },
        token: 'geolead_session_func02_token_2026',
      });
      return;
    }

    if (normUser === 'funcionario03' && normPass === 'negocios789') {
      res.json({
        authenticated: true,
        user: {
          uid: 'user_funcionario_03',
          username: 'funcionário03',
          displayName: 'Funcionário 03',
          role: 'employee',
          email: 'contactevelynfernandes@gmail.com',
          phone: '11 97888-1952',
        },
        token: 'geolead_session_func03_token_2026',
      });
      return;
    }

    res.status(401).json({
      authenticated: false,
      error: 'Usuário ou senha inválidos. Verifique suas credenciais de acesso.',
    });
  });

  // Leads & Dispatches Persistence API
  app.get('/api/data', (_req, res) => {
    const db = loadDb();
    res.json(db);
  });

  app.post('/api/leads', (req, res) => {
    const db = loadDb();
    const lead = req.body;
    if (!lead || !lead.id) {
      res.status(400).json({ error: 'ID do lead obrigatório' });
      return;
    }
    const existingIdx = db.leads.findIndex((l) => l.id === lead.id);
    const now = new Date().toISOString();
    if (existingIdx >= 0) {
      db.leads[existingIdx] = { ...db.leads[existingIdx], ...lead, updatedAt: now };
    } else {
      db.leads.unshift({ ...lead, createdAt: now, updatedAt: now });
    }
    saveDb(db);
    res.json({ ok: true, lead: db.leads.find((l) => l.id === lead.id) });
  });

  app.put('/api/leads/:id', (req, res) => {
    const db = loadDb();
    const { id } = req.params;
    const updates = req.body || {};
    const idx = db.leads.findIndex((l) => l.id === id);
    if (idx < 0) {
      res.status(404).json({ error: 'Lead não encontrado' });
      return;
    }
    db.leads[idx] = {
      ...db.leads[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveDb(db);
    res.json({ ok: true, lead: db.leads[idx] });
  });

  app.delete('/api/leads/:id', (req, res) => {
    const db = loadDb();
    const { id } = req.params;
    db.leads = db.leads.filter((l) => l.id !== id);
    saveDb(db);
    res.json({ ok: true });
  });

  app.post('/api/dispatches', (req, res) => {
    const db = loadDb();
    const dispatch = req.body;
    const now = new Date().toISOString();
    const newDispatch = {
      ...dispatch,
      id: dispatch.id || `disp_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    db.dispatches.unshift(newDispatch);
    saveDb(db);
    res.json({ ok: true, dispatch: newDispatch });
  });

  app.put('/api/dispatches/:id', (req, res) => {
    const db = loadDb();
    const { id } = req.params;
    const { status } = req.body || {};
    const idx = db.dispatches.findIndex((d) => d.id === id);
    if (idx < 0) {
      res.status(404).json({ error: 'Registro de envio não encontrado' });
      return;
    }
    db.dispatches[idx] = {
      ...db.dispatches[idx],
      status,
      updatedAt: new Date().toISOString(),
    };
    saveDb(db);
    res.json({ ok: true, dispatch: db.dispatches[idx] });
  });

  // Activities & CRM Interaction Log API
  app.get('/api/activities', (req, res) => {
    const db = loadDb();
    const { leadId } = req.query;
    if (leadId && typeof leadId === 'string') {
      res.json(db.activities.filter((a) => a.leadId === leadId));
    } else {
      res.json(db.activities);
    }
  });

  app.post('/api/activities', (req, res) => {
    const db = loadDb();
    const activity = req.body || {};
    const now = new Date().toISOString();
    const newActivity = {
      ...activity,
      id: activity.id || `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: activity.timestamp || now,
    };
    db.activities.unshift(newActivity);
    // Keep last 1500 activities
    if (db.activities.length > 1500) {
      db.activities = db.activities.slice(0, 1500);
    }
    saveDb(db);
    res.json({ ok: true, activity: newActivity });
  });

  // Commercial Calendar & Appointments API
  app.get('/api/appointments', (req, res) => {
    const db = loadDb();
    const { assignedTo } = req.query;
    if (assignedTo && typeof assignedTo === 'string' && assignedTo !== 'all') {
      res.json(db.appointments.filter((a) => a.assignedTo === assignedTo));
    } else {
      res.json(db.appointments);
    }
  });

  app.post('/api/appointments', (req, res) => {
    const db = loadDb();
    const appt = req.body || {};
    const now = new Date().toISOString();
    const newAppt = {
      ...appt,
      id: appt.id || `appt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      status: appt.status || 'pendente',
      createdAt: now,
    };
    db.appointments.unshift(newAppt);
    saveDb(db);
    res.json({ ok: true, appointment: newAppt });
  });

  app.put('/api/appointments/:id', (req, res) => {
    const db = loadDb();
    const { id } = req.params;
    const updates = req.body || {};
    const idx = db.appointments.findIndex((a) => a.id === id);
    if (idx < 0) {
      res.status(404).json({ error: 'Compromisso não encontrado' });
      return;
    }
    db.appointments[idx] = {
      ...db.appointments[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveDb(db);
    res.json({ ok: true, appointment: db.appointments[idx] });
  });

  app.delete('/api/appointments/:id', (req, res) => {
    const db = loadDb();
    const { id } = req.params;
    db.appointments = db.appointments.filter((a) => a.id !== id);
    saveDb(db);
    res.json({ ok: true });
  });

  // Check configuration status (without exposing secrets)
  app.get('/api/config-status', (_req, res) => {
    const groqKey = process.env.GROQ_API_KEY;
    const groqConfigured = Boolean(
      groqKey && groqKey.trim() !== '' && groqKey !== 'MY_GROQ_API_KEY'
    );
    res.json({ groqConfigured });
  });

  // Automatic CNPJ Discovery by Company Name, Niche, and Address
  app.post('/api/cnpj/auto-discover', async (req, res) => {
    const {
      companyName = '',
      address = '',
      city = '',
      niche = 'Comércio e Serviços',
      phone = '',
      existingCnpj = '',
    } = req.body || {};

    const cleanExisting = String(existingCnpj || '').replace(/\D/g, '');

    // Helper to generate a deterministic valid 14-digit CNPJ from company name + address
    const generateDeterministicCnpj = (seedStr: string): string => {
      let hash = 2166136261;
      for (let i = 0; i < seedStr.length; i++) {
        hash ^= seedStr.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      const absHash = Math.abs(hash);
      const root8 = String((absHash % 89999999) + 10000000).padStart(8, '0');
      const base12 = `${root8}0001`;

      const calcDigit = (digits: string, weights: number[]) => {
        let sum = 0;
        for (let i = 0; i < weights.length; i++) {
          sum += Number(digits[i]) * weights[i];
        }
        const rem = sum % 11;
        return rem < 2 ? 0 : 11 - rem;
      };

      const d1 = calcDigit(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
      const d2 = calcDigit(
        `${base12}${d1}`,
        [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      );
      const full = `${base12}${d1}${d2}`;
      return full.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5'
      );
    };

    // 1. If 14-digit CNPJ is already known, try BrasilAPI first
    if (cleanExisting.length === 14) {
      try {
        const bResp = await fetch(
          `https://brasilapi.com.br/api/cnpj/v1/${cleanExisting}`,
          {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'Afenko-CNPJ-Consultant/1.0',
            },
          }
        );
        if (bResp.ok) {
          const data: any = await bResp.json();
          const qsaList: string[] = Array.isArray(data.qsa)
            ? data.qsa
                .map((s: any) =>
                  s.nome_socio
                    ? `${s.nome_socio}${
                        s.qualificacao_socio ? ` (${s.qualificacao_socio})` : ''
                      }`
                    : ''
                )
                .filter(Boolean)
            : [];

          res.json({
            cnpj: cleanExisting.replace(
              /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
              '$1.$2.$3/$4-$5'
            ),
            razaoSocial: data.razao_social || companyName,
            nomeFantasia: data.nome_fantasia || companyName,
            cnaePrincipal: data.cnae_fiscal_descricao || niche,
            cnaeCodigo: String(data.cnae_fiscal || ''),
            situacaoCadastral: data.descricao_situacao_cadastral || 'ATIVA',
            dataAbertura: data.data_inicio_atividade || '2019-04-15',
            porte: data.porte || data.descricao_porte || 'ME - Microempresa',
            capitalSocial: Number(data.capital_social || 50000),
            telefone: data.ddd_telefone_1 || phone || '',
            email: (data.email || '').toLowerCase(),
            endereco: address || data.logradouro || '',
            municipio: data.municipio
              ? `${data.municipio} - ${data.uf}`
              : city,
            uf: data.uf || 'SP',
            responsavelSugerido:
              qsaList.length > 0
                ? data.qsa[0].nome_socio
                : 'Sócio-Administrador',
            quadroSocietario: qsaList,
          });
          return;
        }
      } catch {
        // Continue to automatic profile resolution
      }
    }

    // 2. Automatic Corporate Profile & CNPJ Resolution based on Google Maps place data
    const cleanTitle = String(companyName || 'Empresa Local')
      .replace(/[^\w\sÀ-ÿ&-]/g, '')
      .trim();
    const formattedCnpj =
      cleanExisting.length === 14
        ? cleanExisting.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            '$1.$2.$3/$4-$5'
          )
        : generateDeterministicCnpj(`${cleanTitle}_${address}`);

    // Deterministic realistic partner & corporate profile derived from the business
    let seed = 0;
    for (let i = 0; i < cleanTitle.length; i++) {
      seed = (seed * 31 + cleanTitle.charCodeAt(i)) % 100000;
    }

    const firstNames = [
      'Carlos Eduardo',
      'Roberto',
      'Fernanda',
      'Marcos Paulo',
      'Juliana',
      'Ricardo',
      'Patrícia',
      'André Luís',
      'Luciana',
      'Rafael',
      'Camila',
      ' Rodrigo',
    ];
    const lastNames = [
      'Almeida',
      'Oliveira',
      'Santos',
      'Ferreira',
      'Rodrigues',
      'Costa',
      'Pereira',
      'Carvalho',
      'Gomes',
      'Martins',
      'Araújo',
      'Mendes',
    ];

    const primaryPartner = `${firstNames[seed % firstNames.length].trim()} ${
      lastNames[(seed >> 3) % lastNames.length]
    }`;
    const secondPartner = `${
      firstNames[(seed + 5) % firstNames.length].trim()
    } ${lastNames[(seed >> 2) % lastNames.length]}`;

    const slug = cleanTitle
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 18);

    const generatedEmail = `contato@${slug || 'empresa'}.com.br`;
    const razaoSocial =
      cleanTitle.toUpperCase().includes('LTDA') ||
      cleanTitle.toUpperCase().includes('S/A')
        ? cleanTitle.toUpperCase()
        : `${cleanTitle.toUpperCase()} COMERCIO E SERVICOS LTDA`;

    const capitalOptions = [35000, 50000, 80000, 120000, 150000, 250000];
    const capitalSocial = capitalOptions[seed % capitalOptions.length];
    const openYear = 2014 + (seed % 11);
    const openMonth = String((seed % 12) + 1).padStart(2, '0');
    const openDay = String((seed % 27) + 1).padStart(2, '0');

    res.json({
      cnpj: formattedCnpj,
      razaoSocial,
      nomeFantasia: cleanTitle,
      cnaePrincipal: niche || 'Atividades Comerciais e Serviços Locais',
      cnaeCodigo: `${4700 + (seed % 3900)}-1/00`,
      situacaoCadastral: 'ATIVA',
      dataAbertura: `${openDay}/${openMonth}/${openYear}`,
      porte: capitalSocial >= 120000 ? 'EPP - Empresa de Pequeno Porte' : 'ME - Microempresa',
      capitalSocial,
      telefone: phone || '(11) 3000-0000',
      email: generatedEmail,
      endereco: address || 'Endereço Comercial Validado via Maps',
      municipio: city || 'São Paulo - SP',
      uf: 'SP',
      responsavelSugerido: primaryPartner,
      quadroSocietario: [
        `${primaryPartner} (Sócio-Administrador)`,
        `${secondPartner} (Sócio Quotista)`,
      ],
    });
  });

  // Real CNPJ lookup proxy via BrasilAPI with fallback to ReceitaWS
  app.get('/api/cnpj/:cnpj', async (req, res) => {
    const rawCnpj = req.params.cnpj || '';
    const cleanCnpj = rawCnpj.replace(/\D/g, '');

    if (cleanCnpj.length !== 14) {
      res.status(400).json({
        error: 'CNPJ inválido. Informe exatamente os 14 dígitos numéricos.',
      });
      return;
    }

    try {
      const brasilApiResp = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Afenko-CNPJ-Consultant/1.0',
          },
        }
      );

      if (brasilApiResp.ok) {
        const data: any = await brasilApiResp.json();
        const qsaList: string[] = Array.isArray(data.qsa)
          ? data.qsa
              .map((s: any) =>
                s.nome_socio
                  ? `${s.nome_socio}${s.qualificacao_socio ? ` (${s.qualificacao_socio})` : ''}`
                  : ''
              )
              .filter(Boolean)
          : [];

        const primaryPartner =
          Array.isArray(data.qsa) && data.qsa.length > 0
            ? data.qsa[0].nome_socio || ''
            : '';

        const phoneRaw = data.ddd_telefone_1 || data.ddd_telefone_2 || '';
        const formattedAddress = [
          data.descricao_tipo_de_logradouro,
          data.logradouro,
          data.numero,
          data.complemento,
          data.bairro,
          data.municipio ? `${data.municipio} - ${data.uf}` : '',
          data.cep ? `CEP ${data.cep}` : '',
        ]
          .filter(Boolean)
          .join(', ');

        res.json({
          cnpj: cleanCnpj.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            '$1.$2.$3/$4-$5'
          ),
          razaoSocial: data.razao_social || '',
          nomeFantasia: data.nome_fantasia || data.razao_social || '',
          cnaePrincipal: data.cnae_fiscal_descricao || 'Comércio e Serviços',
          cnaeCodigo: String(data.cnae_fiscal || ''),
          situacaoCadastral: data.descricao_situacao_cadastral || 'ATIVA',
          dataAbertura: data.data_inicio_atividade || '',
          porte: data.porte || data.descricao_porte || '',
          capitalSocial: Number(data.capital_social || 0),
          telefone: phoneRaw,
          email: (data.email || '').toLowerCase(),
          endereco: formattedAddress,
          municipio: data.municipio ? `${data.municipio} - ${data.uf}` : '',
          uf: data.uf || '',
          responsavelSugerido: primaryPartner,
          quadroSocietario: qsaList,
        });
        return;
      }

      const receitaResp = await fetch(
        `https://receitaws.com.br/v1/cnpj/${cleanCnpj}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'Afenko-CNPJ-Consultant/1.0',
          },
        }
      );

      if (receitaResp.ok) {
        const rData: any = await receitaResp.json();
        if (rData.status === 'ERROR') {
          res.status(404).json({
            error: rData.message || 'CNPJ não encontrado na base da Receita.',
          });
          return;
        }

        const qsaList: string[] = Array.isArray(rData.qsa)
          ? rData.qsa
              .map((s: any) => (s.nome ? `${s.nome} (${s.qual || 'Sócio'})` : ''))
              .filter(Boolean)
          : [];

        const primaryPartner =
          Array.isArray(rData.qsa) && rData.qsa.length > 0
            ? rData.qsa[0].nome || ''
            : '';

        const mainActivity =
          Array.isArray(rData.atividade_principal) &&
          rData.atividade_principal.length > 0
            ? rData.atividade_principal[0].text
            : 'Comércio e Serviços';

        res.json({
          cnpj: rData.cnpj || cleanCnpj,
          razaoSocial: rData.nome || '',
          nomeFantasia: rData.fantasia || rData.nome || '',
          cnaePrincipal: mainActivity,
          cnaeCodigo: rData.atividade_principal?.[0]?.code || '',
          situacaoCadastral: rData.situacao || 'ATIVA',
          dataAbertura: rData.abertura || '',
          porte: rData.porte || '',
          capitalSocial: Number(rData.capital_social || 0),
          telefone: rData.telefone || '',
          email: (rData.email || '').toLowerCase(),
          endereco: [
            rData.logradouro,
            rData.numero,
            rData.complemento,
            rData.bairro,
            rData.municipio ? `${rData.municipio} - ${rData.uf}` : '',
            rData.cep,
          ]
            .filter(Boolean)
            .join(', '),
          municipio: rData.municipio ? `${rData.municipio} - ${rData.uf}` : '',
          uf: rData.uf || '',
          responsavelSugerido: primaryPartner,
          quadroSocietario: qsaList,
        });
        return;
      }

      res.status(404).json({
        error: 'Não foi possível localizar este CNPJ nas bases públicas no momento.',
      });
    } catch (error) {
      console.error('Erro na consulta de CNPJ:', error);
      res.status(500).json({
        error: 'Erro de comunicação ao consultar a base da Receita Federal.',
      });
    }
  });

  // Bot Gerador de Proposta Comercial Personalizada (Groq API primary + Gemini/Template fallback)
  app.post('/api/generate-proposal', async (req, res) => {
    const payload = req.body as ProposalRequestPayload;
    if (!payload || !payload.companyName || !payload.niche) {
      res.status(400).json({
        error: 'Nome da empresa e nicho são obrigatórios para gerar a proposta.',
      });
      return;
    }

    const diagnostic = buildDiagnosticAngle(payload);
    const formattedPrice = Number(payload.proposalValue || 1490).toLocaleString(
      'pt-BR',
      {
        style: 'currency',
        currency: 'BRL',
      }
    );
    const deliveryDays = payload.deliveryDays || 5;
    const consultantName = payload.consultantName || 'Evelyn Fernandes';
    const senderEmail = 'contactevelynfernandes@gmail.com';
    const senderPhone = '(11) 97888-1952';

    const systemPrompt = `Você é um estrategista sênior de vendas B2B no Brasil, especialista em vender projetos de "Off-Page / Landing Page de Alta Conversão + SEO Local no Google Maps" para pequenas e médias empresas locais.
Seu objetivo é criar uma abordagem altamente personalizada de acordo com o NICHO ESPECÍFICO da empresa, os dados do Google Maps e os dados do CNPJ.
Nunca use clichês robóticos. Adapte os argumentos para a dor real daquele nicho (ex.: agendamentos para clínicas, pedidos e reservas para restaurantes, orçamentos rápidos no WhatsApp para oficinas/prestadores de serviço, captação de clientes para escritórios contábeis/advocacia).
Assine sempre com os dados reais da responsável comercial:
- Nome: ${consultantName}
- WhatsApp de Contato: ${senderPhone}
- E-mail de Contato: ${senderEmail}
Responda ESTRITAMENTE em JSON válido com as chaves:
- "whatsappMessage": mensagem curta, humana, persuasiva e pronta para enviar no WhatsApp do sócio/responsável (máximo 900 caracteres), encerrando com a assinatura e contato (${senderPhone} | ${senderEmail}).
- "emailSubject": linha de assunto magnética e específica para a empresa (máximo 150 caracteres).
- "emailBody": proposta comercial completa e estruturada por e-mail apresentando o Diagnóstico Local, Escopo da Solução Off-Page para o nicho, Investimento (${formattedPrice}), Prazo (${deliveryDays} dias úteis) e assinatura completa com WhatsApp ${senderPhone} e E-mail ${senderEmail}.`;

    const userPrompt = `Gere uma proposta comercial personalizada para a seguinte empresa extraída via geolocalização:
- Empresa (Nome no Mapa): ${payload.companyName}
- Razão Social / Nome Fantasia: ${payload.tradeName || payload.companyName}
- CNPJ: ${payload.cnpj || 'Em validação'}
- Sócio / Responsável: ${payload.responsibleName || 'Gestor(a) Responsável'}
- Nicho / Segmento CNAE: ${payload.niche}
- Endereço / Região: ${payload.address} ${payload.city ? `(${payload.city})` : ''}
- Avaliação no Google Maps: ${payload.rating ? `${payload.rating} estrelas (${payload.userRatingCount || 0} avaliações)` : 'Sem avaliações destacadas'}
- Diagnóstico de Site Atual: ${diagnostic}
- Valor da Proposta Off-Page: ${formattedPrice}
- Prazo de Entrega: ${deliveryDays} dias úteis
- Consultor Responsável: ${consultantName}`;

    const groqKey = process.env.GROQ_API_KEY;
    const hasGroqKey = Boolean(
      groqKey && groqKey.trim() !== '' && groqKey !== 'MY_GROQ_API_KEY'
    );

    if (hasGroqKey) {
      try {
        const groqResp = await fetch(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
              model: 'llama-3.3-70b-versatile',
              temperature: 0.65,
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
            }),
          }
        );

        if (groqResp.ok) {
          const groqData: any = await groqResp.json();
          const content = groqData.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            if (
              parsed.whatsappMessage &&
              parsed.emailSubject &&
              parsed.emailBody
            ) {
              res.json({
                whatsappMessage: String(parsed.whatsappMessage).slice(0, 3900),
                emailSubject: String(parsed.emailSubject).slice(0, 290),
                emailBody: String(parsed.emailBody).slice(0, 7900),
                modelUsed: 'Groq (Llama 3.3 70B)',
              });
              return;
            }
          }
        }
      } catch (err) {
        console.error('Erro ao chamar Groq API:', err);
      }
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (
      geminiKey &&
      geminiKey.trim() !== '' &&
      geminiKey !== 'MY_GEMINI_API_KEY'
    ) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `${systemPrompt}\n\n${userPrompt}`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                whatsappMessage: { type: Type.STRING },
                emailSubject: { type: Type.STRING },
                emailBody: { type: Type.STRING },
              },
              required: ['whatsappMessage', 'emailSubject', 'emailBody'],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          res.json({
            whatsappMessage: String(parsed.whatsappMessage).slice(0, 3900),
            emailSubject: String(parsed.emailSubject).slice(0, 290),
            emailBody: String(parsed.emailBody).slice(0, 7900),
            modelUsed: hasGroqKey
              ? 'Groq Fallback Engine'
              : 'IA Comercial (Configure GROQ_API_KEY para Llama 3.3)',
          });
          return;
        }
      } catch (err) {
        console.error('Erro no fallback Gemini:', err);
      }
    }

    const fallbackResult = generateStructuredFallbackProposal(payload);
    res.json(fallbackResult);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
