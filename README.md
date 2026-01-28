# Roleta da Daily

Sistema de roleta para escolher participantes da daily meeting.

## Stack Tecnológica

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **Prisma** + **PostgreSQL** (Supabase)
- **Zod** para validação
- **bcrypt** para hash de senhas

## Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase (gratuita)
- npm ou yarn

## Instalação e Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Supabase

1. Acesse [https://supabase.com](https://supabase.com) e crie uma conta (se ainda não tiver)
2. Crie um novo projeto
3. Vá em **Settings** > **Database**
4. Copie a **Connection string** (URI) na seção "Connection string" > "URI"
   - Formato: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

### 3. Configurar Variáveis de Ambiente

1. Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

2. Edite o arquivo `.env` e adicione sua `DATABASE_URL` do Supabase:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

**Importante:** Substitua `[YOUR-PASSWORD]` pela senha do seu banco de dados e `[PROJECT-REF]` pela referência do seu projeto.

### 4. Configurar o Banco de Dados

1. Gerar o Prisma Client:

```bash
npm run db:generate
```

2. Executar as migrações:

```bash
npm run db:migrate
```

Você será solicitado a dar um nome à migração (ex: "init"). Digite um nome e pressione Enter.

### 5. Executar o Projeto

```bash
npm run dev
```

O projeto estará disponível em [http://localhost:3000](http://localhost:3000)

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Cria build de produção
- `npm run start` - Inicia servidor de produção
- `npm run lint` - Executa o linter
- `npm run db:generate` - Gera o Prisma Client
- `npm run db:migrate` - Executa migrações do banco
- `npm run db:studio` - Abre o Prisma Studio (interface visual do banco)
- `npm run db:push` - Sincroniza o schema com o banco (sem criar migrações)

## Estrutura do Projeto

```
daily-roulette/
├── app/                    # App Router do Next.js
│   ├── api/               # Route handlers (APIs)
│   │   └── rooms/         # Endpoints de salas
│   ├── room/              # Páginas de sala
│   ├── globals.css        # Estilos globais
│   ├── layout.tsx         # Layout raiz
│   └── page.tsx           # Página inicial
├── components/            # Componentes React
│   └── ui/                # Componentes shadcn/ui
├── lib/                   # Utilitários e helpers
│   ├── apiResponse.ts     # Padronização de respostas API
│   ├── db.ts              # Cliente Prisma
│   ├── errors.ts          # Tratamento de erros
│   └── utils.ts           # Funções utilitárias
├── prisma/                # Prisma
│   └── schema.prisma      # Schema do banco de dados
└── hooks/                 # React hooks customizados
```

## Modelos do Banco de Dados

### Room (Sala)
- `id`: ID único (CUID)
- `name`: Nome da sala
- `slug`: Identificador único na URL (único)
- `passcodeHash`: Hash da senha (bcrypt)
- `createdAt`: Data de criação
- `updatedAt`: Data de atualização

### Participant (Participante)
- `id`: ID único (CUID)
- `roomId`: ID da sala (relacionamento)
- `name`: Nome do participante
- `isPresent`: Se está presente na daily
- `winCount`: Contador de vitórias
- `createdAt`: Data de criação
- `updatedAt`: Data de atualização

### SpinHistory (Histórico de Rodadas)
- `id`: ID único (CUID)
- `roomId`: ID da sala (relacionamento)
- `participantId`: ID do participante vencedor
- `createdAt`: Data da rodada

**Relacionamentos:**
- Ao excluir uma `Room`, todos os `Participant` e `SpinHistory` relacionados são excluídos automaticamente (cascade delete).

## APIs Disponíveis

### POST /api/rooms
Cria uma nova sala.

**Body:**
```json
{
  "name": "Daily Frontend",
  "slug": "daily-frontend",
  "passcode": "senha123"
}
```

**Resposta de Sucesso (201):**
```json
{
  "ok": true,
  "data": {
    "id": "...",
    "name": "Daily Frontend",
    "slug": "daily-frontend",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Resposta de Erro (400/409/500):**
```json
{
  "ok": false,
  "code": "VALIDATION_ERROR",
  "message": "Mensagem de erro"
}
```

### GET /api/rooms/[slug]
Busca uma sala pelo slug.

**Resposta de Sucesso (200):**
```json
{
  "ok": true,
  "data": {
    "id": "...",
    "name": "Daily Frontend",
    "slug": "daily-frontend",
    "createdAt": "...",
    "updatedAt": "...",
    "_count": {
      "participants": 0,
      "spinHistory": 0
    }
  }
}
```

**Resposta de Erro (404/500):**
```json
{
  "ok": false,
  "code": "NOT_FOUND",
  "message": "Sala não encontrada"
}
```

## Códigos de Erro Padronizados

- `VALIDATION_ERROR` (400): Erro de validação dos dados
- `NOT_FOUND` (404): Recurso não encontrado
- `CONFLICT` (409): Conflito (ex: slug já existe)
- `INTERNAL_ERROR` (500): Erro interno do servidor

## Próximos Passos

- [ ] Implementar autenticação por passcode
- [ ] Implementar roleta/canvas
- [ ] Adicionar participantes
- [ ] Histórico de rodadas
- [ ] Estatísticas

## Suporte

Em caso de problemas, verifique:
1. Se a `DATABASE_URL` está correta no `.env`
2. Se as migrações foram executadas (`npm run db:migrate`)
3. Se o Prisma Client foi gerado (`npm run db:generate`)
4. Os logs do console para erros específicos
