export interface PlaybookScript {
  id: string;
  category: 'objecao' | 'abordagem' | 'followup' | 'fechamento';
  title: string;
  subtitle: string;
  situation: string;
  template: string;
  tags: string[];
  tips: string;
}

export const SALES_PLAYBOOK: PlaybookScript[] = [
  // ----------------------------------------------------
  // QUEBRA DE OBJEÇÕES
  // ----------------------------------------------------
  {
    id: 'obj-agencia',
    category: 'objecao',
    title: 'Já tenho agência / Já faço anúncios',
    subtitle: 'Quando o cliente diz que já tem alguém cuidando do marketing',
    situation: 'Cliente responde que já tem agência ou que já investe em Google/Instagram Ads.',
    tags: ['agência', 'anúncios', 'marketing', 'concorrência'],
    tips: 'Nunca critique a agência atual. Posicione a Afenko como um complemento indispensável de presença Off-Page e autoridade orgânica.',
    template: `Entendo perfeitamente, {nome}! É ótimo saber que vocês já investem na imagem da empresa.

A maioria dos nossos clientes parceiros também já tinham agência de tráfego ou social media. O que fazemos na Afenko não substitui o trabalho deles, e sim potencializa: enquanto anúncios pagos param de rodar no momento em que você encerra a verba, a nossa solução Off-Page cria autoridade definitiva e indexação no Google Maps sem custo por clique.

Podemos fazer um teste rápido de 10 minutos para mostrar onde estão vazando oportunidades no mapa da sua região?`,
  },
  {
    id: 'obj-caro',
    category: 'objecao',
    title: 'Achei caro / Sem orçamento no momento',
    subtitle: 'Reenquadramento de preço para retorno sobre investimento (ROI)',
    situation: 'O lead viu o valor da proposta e hesitou pelo custo.',
    tags: ['caro', 'preço', 'desconto', 'orçamento', 'dinheiro'],
    tips: 'Mostre que apenas 1 ou 2 novos clientes já pagam o investimento total da solução da Afenko.',
    template: `Compreendo sua preocupação com o fluxo de caixa, {nome}.

Deixe-me te fazer uma pergunta rápida: quanto vale em média um único cliente fechado no seu negócio?

Com o posicionamento que estruturamos para a {empresa}, com apenas 1 a 2 clientes vindos pelo Google Maps você já recupera 100% desse valor. O restante é lucro puro e autoridade permanente para sua marca.

Além disso, a Evelyn autorizou parcelarmos essa implementação em até 3x para viabilizar o início imediato. O que acha de garantirmos essa condição?`,
  },
  {
    id: 'obj-instagram',
    category: 'objecao',
    title: 'Não preciso de site, meu Instagram já vende',
    subtitle: 'Explicando a diferença entre público frio de rede social e busca com intenção de compra',
    situation: 'O empresário acredita que rede social é o único canal necessário.',
    tags: ['instagram', 'redes sociais', 'sem site', 'whatsapp'],
    tips: 'Ressalte que quem está no Instagram está se distraindo, quem busca no Google está pronto para pagar.',
    template: `O Instagram é fantástico para relacionamento, {nome}! Mas existe uma diferença crucial:

No Instagram, as pessoas estão passando o tempo. No Google, elas estão com o cartão de crédito na mão procurando exatamente "{nicho} perto de mim" para resolver um problema urgente agora.

Sem uma página Off-Page veloz e verificada, essas buscas caem direto no colo do seu concorrente mais próximo. Ter os dois canais é o que blinda a sua fatia de mercado. Faz sentido?`,
  },
  {
    id: 'obj-socio',
    category: 'objecao',
    title: 'Vou ver com meu sócio / Me manda por e-mail',
    subtitle: 'Evitando que a proposta seja esquecida numa caixa de entrada',
    situation: 'O contato diz que vai consultar o sócio ou pede envio passivo por e-mail.',
    tags: ['sócio', 'e-mail', 'analisar', 'depois'],
    tips: 'Não deixe o sócio decidir sem contexto. Agende 10 minutos para apresentar junto.',
    template: `Excelente iniciativa alinhar com o sócio, {nome}!

Para que você não precise gastar seu tempo explicando os detalhes técnicos, que tal alinharmos uma call rápida de 10 minutos amanhã com vocês dois? Assim apresento a tela com o diagnóstico exato da {empresa} e tiro todas as dúvidas diretamente.

Qual horário fica melhor para vocês: pela manhã ou no início da tarde?`,
  },
  {
    id: 'obj-frustrado',
    category: 'objecao',
    title: 'Já tentamos site antes e não tivemos retorno',
    subtitle: 'Diferenciando sites lentos/antigos de soluções Off-Page de alta conversão',
    situation: 'O empresário já gastou com desenvolvedores no passado e se decepcionou.',
    tags: ['passado', 'frustração', 'não deu retorno', 'antigo'],
    tips: 'Valide a dor dele. Explique que um site sem otimização de busca local é como uma loja aberta no meio do deserto.',
    template: `Você tem toda razão em ficar com o pé atrás, {nome}. Infelizmente muitos profissionais entregam sites pesados que ninguém encontra e sem nenhum foco em conversão.

A nossa abordagem na Afenko é diferente: desenvolvemos arquiteturas ultrarrápidas, focadas em carregar em menos de 1 segundo no celular e conectadas diretamente à geolocalização do Google Maps da sua cidade.

Não é apenas "ter um site", é ser encontrado no momento da busca. Gostaria de te mostrar um exemplo real de quem dobrou os contatos com essa mesma estrutura?`,
  },

  // ----------------------------------------------------
  // ABORDAGENS INICIAIS (PRIMEIRO CONTATO)
  // ----------------------------------------------------
  {
    id: 'ab-clinica',
    category: 'abordagem',
    title: 'Saúde & Odontologia (Clínicas e Consultórios)',
    subtitle: 'Foco em agendamentos de consultas particulares e autoridade',
    situation: 'Primeira mensagem no WhatsApp de clínicas médicas, dentistas e estética.',
    tags: ['saúde', 'clínica', 'dentista', 'médico', 'estética'],
    tips: 'Mencione a facilidade de novos pacientes agendarem pelo WhatsApp direto do Google Maps.',
    template: `Olá {responsavel}, tudo bem? Sou da equipe da Evelyn Fernandes aqui na Afenko Soluções Digitais.

Estávamos fazendo um mapeamento de clínicas de destaque em {cidade} e notamos que a {empresa} possui excelentes avaliações no Google Maps, porém ainda não possui uma página própria integrada de agendamento rápido.

Pacientes que pesquisam por tratamentos na sua região estão encontrando outras clínicas pelo caminho. Preparamos uma proposta prática para colocar a {empresa} no topo das buscas locais. Podemos conversar 3 minutinhos?`,
  },
  {
    id: 'ab-advocacia',
    category: 'abordagem',
    title: 'Advocacia & Contabilidade (Serviços Corporativos)',
    subtitle: 'Foco em sobriedade, credibilidade e captação de clientes qualificados',
    situation: 'Primeira abordagem para escritórios de advocacia ou contadores.',
    tags: ['advocacia', 'advogado', 'contabilidade', 'jurídico'],
    tips: 'Ressalte compliance, presença institucional impecável e triagem de clientes.',
    template: `Olá, Dr(a). {responsavel}, tudo bem?

Meu contato é breve e corporativo: trabalho com a Evelyn Fernandes na Afenko — Soluções Off-Page.

Identificamos que o escritório {empresa} tem grande reputação na área de {nicho}, mas o perfil de busca no Google ainda não conta com um portal institucional com botão direto para a secretaria.

Desenvolvemos soluções para escritórios que filtram e atraem clientes qualificados diretamente da pesquisa do Google. Gostaria de lhe encaminhar nossa apresentação em PDF?`,
  },
  {
    id: 'ab-geral',
    category: 'abordagem',
    title: 'Comércio & Serviços Locais (Geral)',
    subtitle: 'Abordagem direta ao ponto para qualquer nicho comercial mapeado no Maps',
    situation: 'Primeiro contato rápido e caloroso para empresas em geral.',
    tags: ['comércio', 'geral', 'serviços', 'loja', 'negócio'],
    tips: 'Mostre que o concorrente está levando clientes que procuram pela região.',
    template: `Olá {responsavel}, tudo bem? Aqui é da equipe comercial de Evelyn Fernandes na Afenko.

Localizamos a {empresa} no Google Maps em {cidade} e vimos que vocês têm um potencial enorme na região, mas seus clientes estão sem um canal oficial com cardápio/serviços e botão de WhatsApp com 1 clique.

Desenvolvemos uma estrutura completa para que quem buscar pela sua área em {cidade} feche com vocês de imediato. Quando podemos trocar uma ideia rápida a respeito?`,
  },

  // ----------------------------------------------------
  // FOLLOW-UPS ESTRATÉGICOS
  // ----------------------------------------------------
  {
    id: 'fu-24h',
    category: 'followup',
    title: 'Follow-up 24h: Cortesia & Dúvidas Rápidas',
    subtitle: 'Lembrete suave após o envio da proposta comercial',
    situation: 'Proposta foi enviada ontem e o cliente ainda não deu retorno.',
    tags: ['24h', 'ontem', 'suave', 'cortesia'],
    tips: 'Tom leve, prestativo e sem cobrança agressiva.',
    template: `Olá {responsavel}, tudo ótimo por aí?

Passando apenas para confirmar se conseguiu abrir a apresentação da proposta que te enviei ontem para a {empresa}.

Ficou alguma dúvida sobre os prazos de entrega ou sobre a integração com o Google Maps? Fico à disposição para esclarecer!`,
  },
  {
    id: 'fu-48h',
    category: 'followup',
    title: 'Follow-up 48h: Gatilho de Concorrência no Mapa',
    subtitle: 'Mostrando que o mercado continua rodando enquanto ele pensa',
    situation: 'Lead parado há 2 dias após envio da proposta.',
    tags: ['48h', 'concorrência', 'urgência', 'mercado'],
    tips: 'Desperte o medo de perder clientes para quem já tem presença no Google.',
    template: `Oi {responsavel}, bom dia!

Estava revisando aqui as buscas para {nicho} na sua região de {cidade}, e notei que os concorrentes próximos estão recebendo todo o tráfego de quem pesquisa no celular.

A nossa estrutura para a {empresa} já está praticamente desenhada para entrar no ar esta semana. Vamos dar o start para você não deixar essas vendas na mesa?`,
  },
  {
    id: 'fu-7dias',
    category: 'followup',
    title: 'Follow-up Ultimato (7 dias): "Posso arquivar?"',
    subtitle: 'Gatilho de perda e desapego que faz o lead responder imediatamente',
    situation: 'Lead com proposta enviada há uma semana sem retorno.',
    tags: ['ultimato', 'desapego', 'arquivar', '7 dias'],
    tips: 'É o follow-up de maior taxa de resposta no mundo comercial.',
    template: `Olá {responsavel}, tudo bem?

Como não tivemos seu retorno sobre o projeto da {empresa}, imagino que suas prioridades mudaram neste momento.

Posso arquivar a sua proposta comercial e liberar a condição especial para outra empresa do mesmo segmento na sua região, ou ainda faz sentido conversarmos esta semana?`,
  },

  // ----------------------------------------------------
  // FECHAMENTO & CRIAÇÃO DE URGÊNCIA
  // ----------------------------------------------------
  {
    id: 'close-exclusividade',
    category: 'fechamento',
    title: 'Vaga Exclusiva por Bairro / Região',
    subtitle: 'Gatilho de escassez real para acelerar a assinatura do contrato',
    situation: 'Cliente interessado, mas procrastinando para assinar.',
    tags: ['escassez', 'exclusividade', 'região', 'fechar'],
    tips: 'Explique a política da Afenko de não posicionar dois concorrentes diretos lado a lado no mesmo raio.',
    template: `Fala {responsavel}!

Conversei agora com a Evelyn Fernandes (nossa gestora) e temos uma política interna: só pegamos 1 cliente de {nicho} por micro-região para garantir exclusividade nos resultados do Maps.

Como já iniciamos a conversa com você, a preferência é 100% da {empresa}. Se fecharmos hoje, eu já travo essa vaga e ninguém mais do seu segmento entra no nosso radar no seu bairro. Fechamos?`,
  },
  {
    id: 'close-bonus',
    category: 'fechamento',
    title: 'Bônus de Otimização Google Meu Negócio',
    subtitle: 'Adicionando valor percebido sem dar desconto em dinheiro',
    situation: 'Cliente pede desconto ou vantagem adicional para fechar.',
    tags: ['bônus', 'vantagem', 'google meu negocio', 'maps'],
    tips: 'Ofereça o serviço adicional em vez de diminuir a sua margem de lucro.',
    template: `{responsavel}, consigo algo ainda melhor para você:

Em vez de mexer no valor e tirar itens da estrutura da página, a Evelyn autorizou incluir como bônus a Otimização Completa do seu Google Meu Negócio (cadastro de palavras-chave, fotos e categorias certas).

Esse serviço isolado custa R$ 600,00 no mercado, mas fechando o contrato hoje ele vai 100% gratuito no pacote da {empresa}. Mando o link de formalização agora?`,
  },
];
