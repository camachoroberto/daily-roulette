# Como Funciona o Backend e Banco de Dados

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Camada de Dados (Prisma)](#camada-de-dados-prisma)
3. [Camada de API (Route Handlers)](#camada-de-api-route-handlers)
4. [Sistema de Autenticação](#sistema-de-autenticação)
5. [Fluxo Completo de uma Requisição](#fluxo-completo-de-uma-requisição)
6. [Exemplos Práticos](#exemplos-práticos)

---

## 🎯 Visão Geral

O backend é construído com **Next.js Route Handlers** (App Router) que funcionam como endpoints de API. A comunicação com o banco de dados é feita através do **Prisma ORM**, que abstrai as queries SQL e fornece type-safety.

```
Cliente → Route Handler → Prisma ORM → PostgreSQL
```

---

## 🗄 Camada de Dados (Prisma)

### Configuração do Prisma Client

**Arquivo: `lib/db.ts`**

```typescript
import { PrismaClient } from "@prisma/client";

// Singleton pattern para evitar múltiplas instâncias
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" 
      ? ["query", "error", "warn"] 
      : ["error"],
  });

// Em desenvolvimento, reutiliza a mesma instância
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

**Por que Singleton?**
- Evita criar múltiplas conexões com o banco
- Em desenvolvimento, reutiliza a instância entre hot-reloads
- Em produção (serverless), cada função cria sua própria instância

### Schema do Banco de Dados

**Arquivo: `prisma/schema.prisma`**

```prisma
model Room {
  id           String         @id @default(cuid())
  name         String
  slug         String         @unique
  passcodeHash String
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  participants Participant[]
  spinHistory  SpinHistory[]

  @@map("rooms")
}

model Participant {
  id           String        @id @default(cuid())
  roomId       String
  name         String
  isPresent    Boolean       @default(true)
  winCount     Int           @default(0)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  room         Room          @relation(fields: [roomId], references: [id], onDelete: Cascade)
  spinHistory  SpinHistory[]

  @@map("participants")
}

model SpinHistory {
  id           String      @id @default(cuid())
  roomId       String
  participantId String
  createdAt    DateTime    @default(now())
  room         Room        @relation(fields: [roomId], references: [id], onDelete: Cascade)
  participant  Participant @relation(fields: [participantId], references: [id], onDelete: Cascade)

  @@map("spin_history")
}
```

**Características:**
- **IDs**: CUID (Collision-resistant Unique Identifier)
- **Relacionamentos**: 1:N (Room → Participant, Room → SpinHistory)
- **Cascade Delete**: Ao excluir Room, exclui automaticamente Participants e SpinHistory
- **Timestamps**: `createdAt` e `updatedAt` automáticos

### Queries Prisma - Exemplos

#### 1. Buscar Sala por Slug
```typescript
const room = await db.room.findUnique({
  where: { slug },
  select: { id: true }, // Apenas o campo id (otimização)
});
```

#### 2. Buscar Participantes Presentes
```typescript
const participants = await db.participant.findMany({
  where: {
    roomId: room.id,
    isPresent: true, // Filtro
  },
  select: {
    id: true,
    name: true,
    winCount: true,
  },
  orderBy: { createdAt: "asc" },
});
```

#### 3. Criar Participante
```typescript
const participant = await db.participant.create({
  data: {
    roomId: room.id,
    name: name.trim(),
    isPresent: true,
    winCount: 0,
  },
  select: {
    id: true,
    name: true,
    isPresent: true,
    winCount: true,
    createdAt: true,
    updatedAt: true,
  },
});
```

#### 4. Transação Atômica (Sorteio)
```typescript
const result = await db.$transaction(async (tx) => {
  // 1. Criar histórico
  const spinHistory = await tx.spinHistory.create({
    data: {
      roomId: room.id,
      participantId: winner.id,
    },
    include: {
      participant: {
        select: { id: true, name: true },
      },
    },
  });

  // 2. Incrementar contador
  const updatedParticipant = await tx.participant.update({
    where: { id: winner.id },
    data: {
      winCount: { increment: 1 }, // Operação atômica
    },
    select: {
      id: true,
      name: true,
      winCount: true,
    },
  });

  return { winner: updatedParticipant, spinHistory };
});
```

**Por que Transação?**
- Garante que histórico e contador são atualizados juntos
- Se uma operação falhar, ambas são revertidas (rollback)
- Evita inconsistências de dados

---

## 🔌 Camada de API (Route Handlers)

### Estrutura de um Route Handler

**Padrão Geral:**
```typescript
export async function GET/POST/PATCH/DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // 1. Validação de entrada
    // 2. Autenticação (se necessário)
    // 3. Lógica de negócio
    // 4. Query no banco
    // 5. Resposta de sucesso
  } catch (error) {
    // Tratamento de erro padronizado
  }
}
```

### Exemplo Completo: Criar Participante

**Arquivo: `app/api/rooms/[slug]/participants/route.ts`**

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // 1. Buscar sala
    const room = await db.room.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!room) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "Sala não encontrada"),
        { status: 404 }
      );
    }

    // 2. Verificar autenticação
    const session = await requireRoomSession(request, room.id);
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHORIZED", "Sessão inválida ou expirada"),
        { status: 401 }
      );
    }

    // 3. Validar body com Zod
    const body = await request.json();
    const validationResult = createParticipantSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => e.message)
        .join(", ");
      return NextResponse.json(
        errorResponse("VALIDATION_ERROR", errors),
        { status: 400 }
      );
    }

    const { name } = validationResult.data;

    // 4. Criar participante no banco
    const participant = await db.participant.create({
      data: {
        roomId: room.id,
        name: name.trim(),
        isPresent: true,
        winCount: 0,
      },
      select: {
        id: true,
        name: true,
        isPresent: true,
        winCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 5. Retornar sucesso
    return NextResponse.json(
      successResponse(participant), 
      { status: 201 }
    );
  } catch (error) {
    // Tratamento de erro
    console.error("Erro ao criar participante:", error);
    const errorResponse = handleApiError(error);
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
```

### Padronização de Respostas

**Arquivo: `lib/apiResponse.ts`**

```typescript
// Resposta de Sucesso
{
  ok: true,
  data: { ... }
}

// Resposta de Erro
{
  ok: false,
  code: "ERROR_CODE",
  message: "Mensagem de erro"
}
```

**Funções Helper:**
```typescript
successResponse(data)  // Cria resposta de sucesso
errorResponse(code, message)  // Cria resposta de erro
handleApiError(error)  // Trata erros automaticamente
```

---

## 🔐 Sistema de Autenticação

### Fluxo de Autenticação

**Arquivo: `lib/auth.ts`**

#### 1. Criar Sessão (Login)
```typescript
export async function createRoomSession(roomId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

  const session = await new SignJWT({ roomId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret);

  return session;
}
```

**O que acontece:**
- Cria token JWT com `roomId` no payload
- Define expiração de 7 dias
- Assina com `SESSION_SECRET`

#### 2. Verificar Sessão
```typescript
export async function requireRoomSession(
  request: NextRequest,
  roomId: string
): Promise<RoomSession | null> {
  // 1. Extrai cookie
  const sessionToken = request.cookies.get("room_session")?.value;
  if (!sessionToken) return null;

  // 2. Verifica e decodifica JWT
  const session = await verifyRoomSession(sessionToken);
  if (!session) return null;

  // 3. Valida roomId
  if (session.roomId !== roomId) return null;

  // 4. Verifica expiração
  if (session.exp * 1000 < Date.now()) return null;

  return session;
}
```

**Por que JWT?**
- ✅ Stateless (não precisa armazenar sessões no banco)
- ✅ Escalável (funciona em múltiplos servidores)
- ✅ Serverless-friendly (compatível com Vercel Edge Functions)
- ✅ Expiração automática

### Cookie de Sessão

```typescript
response.cookies.set("room_session", token, {
  httpOnly: true,        // Não acessível via JavaScript
  secure: true,          // Apenas HTTPS em produção
  sameSite: "lax",       // Proteção CSRF
  maxAge: 7 * 24 * 60 * 60, // 7 dias
  path: "/",
});
```

---

## 🔄 Fluxo Completo de uma Requisição

### Exemplo: Sorteio (Spin)

```
1. Cliente faz requisição
   POST /api/rooms/daily-frontend/spin
   Cookie: room_session=<JWT>

2. Route Handler recebe requisição
   └─> Extrai slug dos params
   └─> Busca Room no banco por slug

3. Verifica autenticação
   └─> Extrai cookie room_session
   └─> Verifica JWT (lib/auth.ts)
   └─> Valida roomId no token

4. Busca participantes presentes
   └─> db.participant.findMany({ isPresent: true })
   └─> Valida que há pelo menos 1

5. Seleciona vencedor aleatório
   └─> Math.floor(Math.random() * length)

6. Executa transação atômica
   └─> db.$transaction([
         - Cria SpinHistory
         - Incrementa winCount
       ])

7. Retorna resultado
   └─> successResponse({ winner, spinHistory })

8. Cliente recebe resposta
   └─> Atualiza UI com vencedor
```

### Código Completo do Sorteio

```typescript
export async function POST(request: NextRequest, { params }) {
  try {
    const { slug } = params;

    // 1. Buscar sala
    const room = await db.room.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!room) {
      return NextResponse.json(
        errorResponse("NOT_FOUND", "Sala não encontrada"),
        { status: 404 }
      );
    }

    // 2. Verificar autenticação
    const session = await requireRoomSession(request, room.id);
    if (!session) {
      return NextResponse.json(
        errorResponse("UNAUTHORIZED", "Sessão inválida"),
        { status: 401 }
      );
    }

    // 3. Buscar participantes presentes
    const presentParticipants = await db.participant.findMany({
      where: {
        roomId: room.id,
        isPresent: true,
      },
      select: {
        id: true,
        name: true,
        winCount: true,
      },
    });

    if (presentParticipants.length === 0) {
      return NextResponse.json(
        errorResponse("NO_PRESENT_PARTICIPANTS", "Não há participantes"),
        { status: 400 }
      );
    }

    // 4. Selecionar vencedor aleatório
    const randomIndex = Math.floor(
      Math.random() * presentParticipants.length
    );
    const winner = presentParticipants[randomIndex];

    // 5. Transação atômica
    const result = await db.$transaction(async (tx) => {
      // Criar histórico
      const spinHistory = await tx.spinHistory.create({
        data: {
          roomId: room.id,
          participantId: winner.id,
        },
        include: {
          participant: {
            select: { id: true, name: true },
          },
        },
      });

      // Incrementar contador
      const updatedParticipant = await tx.participant.update({
        where: { id: winner.id },
        data: { winCount: { increment: 1 } },
        select: {
          id: true,
          name: true,
          winCount: true,
        },
      });

      return {
        winner: updatedParticipant,
        spinHistory,
      };
    });

    // 6. Retornar sucesso
    return NextResponse.json(successResponse(result));
  } catch (error) {
    console.error("Erro ao sortear:", error);
    return NextResponse.json(
      handleApiError(error),
      { status: 500 }
    );
  }
}
```

---

## 📊 Exemplos Práticos

### 1. Buscar Histórico (GET)

```typescript
// app/api/rooms/[slug]/history/route.ts

export async function GET(request: NextRequest, { params }) {
  const { slug } = params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  // Buscar sala
  const room = await db.room.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!room) {
    return NextResponse.json(
      errorResponse("NOT_FOUND", "Sala não encontrada"),
      { status: 404 }
    );
  }

  // Buscar histórico com relacionamento
  const history = await db.spinHistory.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100), // Máximo 100
    include: {
      participant: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return NextResponse.json(successResponse(history));
}
```

**Query SQL equivalente (gerada pelo Prisma):**
```sql
SELECT 
  sh.*,
  p.id as "participant.id",
  p.name as "participant.name"
FROM spin_history sh
INNER JOIN participants p ON sh.participant_id = p.id
WHERE sh.room_id = $1
ORDER BY sh.created_at DESC
LIMIT $2;
```

### 2. Atualizar Presença (PATCH)

```typescript
// app/api/rooms/[slug]/participants/[id]/route.ts

export async function PATCH(request: NextRequest, { params }) {
  const { slug, id } = params;

  // Buscar sala e verificar auth
  const room = await db.room.findUnique({ where: { slug } });
  const session = await requireRoomSession(request, room.id);
  if (!session) return unauthorized();

  // Buscar participante
  const participant = await db.participant.findUnique({
    where: { id },
  });

  if (!participant || participant.roomId !== room.id) {
    return NextResponse.json(
      errorResponse("NOT_FOUND", "Participante não encontrado"),
      { status: 404 }
    );
  }

  // Toggle presença
  const updated = await db.participant.update({
    where: { id },
    data: {
      isPresent: !participant.isPresent,
    },
    select: {
      id: true,
      name: true,
      isPresent: true,
      winCount: true,
    },
  });

  return NextResponse.json(successResponse(updated));
}
```

### 3. Resetar Sala (POST)

```typescript
// app/api/rooms/[slug]/reset/route.ts

export async function POST(request: NextRequest, { params }) {
  const { slug } = params;

  // Verificar autenticação
  const room = await db.room.findUnique({ where: { slug } });
  const session = await requireRoomSession(request, room.id);
  if (!session) return unauthorized();

  // Transação: deletar histórico e zerar contadores
  await db.$transaction(async (tx) => {
    // Deletar histórico
    await tx.spinHistory.deleteMany({
      where: { roomId: room.id },
    });

    // Zerar winCount de todos participantes
    await tx.participant.updateMany({
      where: { roomId: room.id },
      data: { winCount: 0 },
    });
  });

  return NextResponse.json(
    successResponse({ message: "Sala resetada" })
  );
}
```

---

## 🔍 Otimizações e Boas Práticas

### 1. Select Específico
```typescript
// ❌ Ruim: busca todos os campos
const room = await db.room.findUnique({ where: { slug } });

// ✅ Bom: busca apenas o necessário
const room = await db.room.findUnique({
  where: { slug },
  select: { id: true },
});
```

### 2. Índices no Banco
- `slug` em Room é `@unique` (índice automático)
- Queries por `slug` são rápidas

### 3. Transações para Operações Atômicas
```typescript
// Garante que múltiplas operações acontecem juntas
await db.$transaction(async (tx) => {
  await tx.spinHistory.create(...);
  await tx.participant.update(...);
});
```

### 4. Validação com Zod
```typescript
// Validação type-safe em runtime
const schema = z.object({
  name: z.string().min(1).max(100),
});
const result = schema.safeParse(data);
```

### 5. Tratamento de Erros Padronizado
```typescript
try {
  // código
} catch (error) {
  return NextResponse.json(
    handleApiError(error),
    { status: 500 }
  );
}
```

---

## 📈 Performance

### Connection Pooling
- Prisma gerencia pool de conexões automaticamente
- Reutiliza conexões entre requisições
- Configurável via `DATABASE_URL`

### Queries Otimizadas
- `select` específico reduz tráfego de rede
- `where` com índices é rápido
- `include` faz JOIN eficiente

### Logs em Desenvolvimento
```typescript
log: ["query", "error", "warn"] // Mostra queries SQL
```

---

## 🎯 Resumo

### Backend
- ✅ Route Handlers do Next.js (App Router)
- ✅ Validação com Zod
- ✅ Autenticação JWT stateless
- ✅ Respostas padronizadas
- ✅ Tratamento de erros consistente

### Banco de Dados
- ✅ Prisma ORM (type-safe)
- ✅ PostgreSQL (Supabase)
- ✅ Relacionamentos 1:N
- ✅ Cascade delete
- ✅ Transações atômicas

### Segurança
- ✅ Senhas com hash bcrypt
- ✅ JWT assinado
- ✅ Cookies httpOnly
- ✅ Validação de entrada

---

**Última atualização**: Janeiro 2026
