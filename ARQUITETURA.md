# Arquitetura do Sistema - Daily Roulette

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Arquitetura em Camadas](#arquitetura-em-camadas)
4. [Padrões Arquiteturais](#padrões-arquiteturais)
5. [Fluxo de Dados](#fluxo-de-dados)
6. [Decisões Técnicas](#decisões-técnicas)
7. [Segurança](#segurança)
8. [Escalabilidade](#escalabilidade)

---

## 🎯 Visão Geral

Sistema web full-stack para sorteio aleatório de participantes em daily meetings, utilizando arquitetura moderna baseada em **Next.js App Router** com separação clara entre frontend e backend.

### Características Principais
- **Full-Stack**: Frontend e Backend na mesma aplicação Next.js
- **Type-Safe**: TypeScript end-to-end
- **Serverless-Ready**: Route Handlers compatíveis com Vercel Edge/Serverless
- **Stateless**: Autenticação baseada em JWT sem sessões server-side

---

## 🛠 Stack Tecnológica

### Frontend
- **Next.js 14** (App Router) - Framework React com SSR/SSG
- **React 18** - Biblioteca UI com hooks modernos
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização utility-first
- **shadcn/ui** - Componentes acessíveis e customizáveis
- **Canvas API** - Renderização da roleta com animações

### Backend
- **Next.js Route Handlers** - API Routes (App Router)
- **Prisma ORM** - Camada de acesso a dados type-safe
- **PostgreSQL** (Supabase) - Banco de dados relacional
- **Zod** - Validação de schemas runtime
- **JWT (jose)** - Autenticação stateless
- **bcrypt** - Hash de senhas

### DevOps
- **Vercel** - Deploy e hosting
- **Supabase** - PostgreSQL gerenciado
- **Git** - Controle de versão

---

## 🏗 Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────┐
│                    CAMADA DE APRESENTAÇÃO                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Pages      │  │  Components  │  │    Hooks     │  │
│  │  (App Router)│  │  (React UI)   │  │ (Custom)     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕ HTTP/JSON
┌─────────────────────────────────────────────────────────┐
│                    CAMADA DE API                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Route        │  │  Validation  │  │  Auth        │  │
│  │ Handlers     │  │  (Zod)       │  │  (JWT)       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↕ Prisma Client
┌─────────────────────────────────────────────────────────┐
│                    CAMADA DE DADOS                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Prisma     │  │  PostgreSQL  │  │  Migrations  │  │
│  │    ORM       │  │  (Supabase)  │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 1. Camada de Apresentação (Frontend)

**Estrutura:**
```
app/
├── page.tsx              # Página inicial (criar/entrar sala)
├── room/[slug]/page.tsx  # Página da sala (roleta + participantes)
└── layout.tsx            # Layout raiz

components/
├── roulette.tsx          # Componente Canvas da roleta
├── winner-card.tsx        # Card do vencedor
└── ui/                    # Componentes shadcn/ui
```

**Características:**
- **Client Components**: Componentes interativos com `"use client"`
- **Server Components**: Por padrão (quando possível)
- **Estado Local**: React hooks (`useState`, `useEffect`, `useCallback`)
- **Otimizações**: Memoização com `useCallback` para evitar re-renders

### 2. Camada de API (Backend)

**Estrutura:**
```
app/api/rooms/
├── route.ts                    # POST /api/rooms (criar sala)
└── [slug]/
    ├── route.ts                # GET/DELETE /api/rooms/[slug]
    ├── auth/route.ts           # POST /api/rooms/[slug]/auth
    ├── check-session/route.ts  # GET /api/rooms/[slug]/check-session
    ├── participants/
    │   ├── route.ts            # GET/POST /api/rooms/[slug]/participants
    │   └── [id]/route.ts       # PATCH/DELETE /api/rooms/[slug]/participants/[id]
    ├── spin/route.ts           # POST /api/rooms/[slug]/spin
    ├── history/route.ts        # GET /api/rooms/[slug]/history
    ├── reset/route.ts          # POST /api/rooms/[slug]/reset
    └── logout/route.ts         # POST /api/rooms/[slug]/logout
```

**Padrão de Resposta Padronizado:**
```typescript
// Sucesso
{ ok: true, data: {...} }

// Erro
{ ok: false, code: "ERROR_CODE", message: "..." }
```

### 3. Camada de Dados

**Prisma Schema:**
```prisma
Room (1) ──< (N) Participant
  │
  └──< (N) SpinHistory
       │
       └──> (1) Participant
```

**Modelos:**
- **Room**: Salas com autenticação por senha
- **Participant**: Participantes vinculados a salas
- **SpinHistory**: Auditoria de sorteios

**Relacionamentos:**
- Cascade Delete: Exclusão de Room remove automaticamente Participants e SpinHistory
- Índices: `slug` único em Room para busca rápida

---

## 🎨 Padrões Arquiteturais

### 1. **Separation of Concerns (SoC)**
- **Pages**: Orquestração e navegação
- **Components**: UI reutilizável e isolada
- **API Routes**: Lógica de negócio e validação
- **Lib**: Utilitários e helpers compartilhados

### 2. **Repository Pattern (via Prisma)**
- Prisma Client encapsula acesso ao banco
- Queries type-safe geradas automaticamente
- Migrations versionadas

### 3. **Middleware Pattern (Auth)**
```typescript
// Verificação de sessão em rotas protegidas
const session = await requireRoomSession(request, roomId)
if (!session) return unauthorized()
```

### 4. **Error Handling Padronizado**
```typescript
// Respostas de erro consistentes
errorResponse("VALIDATION_ERROR", "Mensagem")
errorResponse("NOT_FOUND", "Sala não encontrada")
errorResponse("UNAUTHORIZED", "Sessão inválida")
```

### 5. **Validation Layer (Zod)**
- Validação de entrada em todas as APIs
- Type inference automático
- Mensagens de erro customizadas

---

## 🔄 Fluxo de Dados

### Fluxo de Autenticação

```
1. Usuário → POST /api/rooms/[slug]/auth
   └── Body: { passcode: "senha123" }
   
2. Backend valida senha (bcrypt.compare)
   └── Se válida: cria JWT token
   
3. Backend define cookie httpOnly
   └── Cookie: room_session = <JWT>
   
4. Próximas requisições incluem cookie automaticamente
   └── Backend verifica JWT em cada request protegido
```

### Fluxo de Sorteio

```
1. Frontend → POST /api/rooms/[slug]/spin
   └── Cookie: room_session (JWT)
   
2. Backend valida sessão
   └── requireRoomSession(request, roomId)
   
3. Backend busca participantes presentes
   └── db.participant.findMany({ isPresent: true })
   
4. Backend seleciona vencedor aleatório
   └── Math.floor(Math.random() * length)
   
5. Backend executa transação atômica
   ├── Cria SpinHistory
   └── Incrementa winCount
   
6. Backend retorna resultado
   └── { winner: {...}, spinHistory: {...} }
   
7. Frontend atualiza UI
   ├── Define winnerId para animação
   └── Atualiza histórico após animação
```

### Fluxo de Renderização da Roleta

```
1. Componente Roulette recebe winnerId
   
2. Calcula ângulo final do vencedor
   └── getWinnerAngle(winnerId)
   
3. Inicia animação com requestAnimationFrame
   ├── 5 voltas completas (1800°)
   └── Ajuste fino para alinhar vencedor
   
4. Easing ease-out-cubic
   └── Desaceleração suave nos últimos frames
   
5. Após animação: onSpinComplete()
   ├── Atualiza histórico na UI
   └── Mostra WinnerCard
```

---

## 💡 Decisões Técnicas

### 1. **Next.js App Router vs Pages Router**
✅ **Escolhido: App Router**
- Roteamento baseado em arquivos mais intuitivo
- Server Components por padrão
- Route Handlers integrados
- Melhor suporte a layouts aninhados

### 2. **Prisma vs TypeORM/Sequelize**
✅ **Escolhido: Prisma**
- Type-safety end-to-end
- Migrations versionadas
- Geração automática de tipos
- Query builder intuitivo

### 3. **JWT vs Session Cookies**
✅ **Escolhido: JWT**
- Stateless (escalável)
- Compatível com serverless
- Validação sem banco de dados
- Expiração automática

### 4. **bcrypt vs Argon2**
✅ **Escolhido: bcrypt**
- Padrão da indústria
- Bem testado e estável
- 10 rounds (balance entre segurança e performance)

### 5. **Canvas API vs SVG**
✅ **Escolhido: Canvas**
- Melhor performance para animações
- Controle total sobre renderização
- Suporte a transformações complexas

### 6. **Zod vs Yup/Joi**
✅ **Escolhido: Zod**
- TypeScript-first
- Type inference automático
- API moderna e intuitiva
- Melhor integração com Prisma

---

## 🔒 Segurança

### Camadas de Segurança

1. **Autenticação**
   - Senhas com hash bcrypt (10 rounds)
   - JWT assinado com secret
   - Cookies httpOnly (não acessíveis via JS)
   - Cookies secure em produção

2. **Validação**
   - Validação de entrada com Zod
   - Sanitização automática
   - Validação de tipos em runtime

3. **Autorização**
   - Verificação de sessão em rotas protegidas
   - Validação de roomId no token
   - Expiração automática (7 dias)

4. **Proteção de Dados**
   - Senhas nunca retornadas nas APIs
   - Cascade delete para integridade
   - Transações atômicas para consistência

### Headers de Segurança (Vercel)
- HTTPS obrigatório em produção
- CORS configurado
- Content-Security-Policy (via Next.js)

---

## 📈 Escalabilidade

### Pontos de Escala

1. **Frontend**
   - Static Generation quando possível
   - Code splitting automático (Next.js)
   - Lazy loading de componentes

2. **Backend**
   - Route Handlers serverless (Vercel)
   - Stateless (JWT)
   - Connection pooling (Prisma)

3. **Banco de Dados**
   - Índices em campos de busca (`slug`)
   - Cascade delete eficiente
   - Queries otimizadas (select específico)

### Limitações Atuais

- **Sessões**: JWT em memória (não revogável até expirar)
- **Concorrência**: Sorteio não previne race conditions múltiplas
- **Cache**: Sem cache de queries (pode ser adicionado)

### Melhorias Futuras

- [ ] Rate limiting nas APIs
- [ ] Cache com Redis para queries frequentes
- [ ] WebSockets para atualizações em tempo real
- [ ] CDN para assets estáticos
- [ ] Database read replicas para leitura

---

## 📊 Métricas e Monitoramento

### Logs
- Erros logados no console (desenvolvimento)
- Vercel Analytics (produção)
- Prisma query logs (desenvolvimento)

### Observabilidade (Futuro)
- [ ] Sentry para error tracking
- [ ] Vercel Analytics para performance
- [ ] Database query monitoring

---

## 🚀 Deploy e CI/CD

### Build Process
```bash
prisma generate  # Gera Prisma Client
next build        # Build da aplicação
```

### Variáveis de Ambiente
- `DATABASE_URL`: Connection string PostgreSQL
- `SESSION_SECRET`: Secret para assinar JWT
- `NODE_ENV`: Ambiente (development/production)

### Vercel
- Deploy automático via Git
- Preview deployments para PRs
- Edge Functions para rotas estáticas

---

## 📚 Estrutura de Pastas

```
daily-roulette/
├── app/                    # Next.js App Router
│   ├── api/               # Route Handlers (Backend)
│   ├── room/              # Páginas da aplicação
│   ├── layout.tsx         # Layout raiz
│   └── page.tsx           # Página inicial
├── components/            # Componentes React
│   ├── ui/                # Componentes shadcn/ui
│   ├── roulette.tsx       # Componente da roleta
│   └── winner-card.tsx    # Card do vencedor
├── lib/                   # Utilitários e helpers
│   ├── db.ts              # Prisma Client singleton
│   ├── auth.ts            # Funções de autenticação JWT
│   ├── apiResponse.ts     # Padronização de respostas
│   ├── errors.ts          # Tratamento de erros
│   └── utils.ts           # Funções utilitárias
├── hooks/                 # React hooks customizados
├── prisma/                # Prisma
│   └── schema.prisma      # Schema do banco de dados
└── public/                # Assets estáticos
```

---

## 🎯 Conclusão

A arquitetura foi projetada para:
- ✅ **Manutenibilidade**: Código organizado e type-safe
- ✅ **Escalabilidade**: Stateless e serverless-ready
- ✅ **Segurança**: Múltiplas camadas de proteção
- ✅ **Performance**: Otimizações em cada camada
- ✅ **Developer Experience**: TypeScript, Prisma, Zod

---

**Última atualização**: Janeiro 2026
