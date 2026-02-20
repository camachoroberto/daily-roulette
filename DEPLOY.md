# Publicar em produção

## 1. Antes de publicar

- [ ] **Banco em produção**: Postgres acessível na internet (Supabase, Neon, Railway, etc.).
- [ ] **Variáveis de ambiente** definidas no provedor (veja abaixo).
- [ ] **Migrations aplicadas** no banco de produção (uma vez).

## 2. Variáveis de ambiente (produção)

Configure no painel do seu provedor (Vercel, etc.):

| Variável          | Obrigatório | Exemplo / descrição |
|-------------------|-------------|----------------------|
| `DATABASE_URL`    | Sim         | URL do Postgres (ex: Supabase, Neon). |
| `SESSION_SECRET`  | Sim         | String aleatória longa (mín. 32 caracteres). |

Exemplo de `SESSION_SECRET` (gere uma nova para produção):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Opção A: Vercel (recomendado para Next.js)

1. **Conta**: [vercel.com](https://vercel.com) e login (GitHub, etc.).

2. **Importar projeto**:
   - “Add New” → “Project” → importe o repositório Git do `daily-roulette`.
   - Framework: Next.js (detectado automaticamente).
   - Root Directory: deixe em branco se o app estiver na raiz.

3. **Variáveis de ambiente**:
   - Em “Environment Variables” adicione:
     - `DATABASE_URL` = URL do Postgres de produção.
     - `SESSION_SECRET` = valor gerado acima.
   - Marque **Production** (e opcionalmente Preview).

4. **Build**:
   - Build Command: `prisma generate && next build` (ou use o script `build` do `package.json`).
   - Output: deixe padrão (Next.js).
   - Deploy.

5. **Rodar migrations no banco de produção** (uma vez):

   No seu PC, com a **URL de produção** no `.env` (só para esse comando):

   ```bash
   set DATABASE_URL="sua-url-postgres-producao"
   npx prisma migrate deploy
   ```

   Ou use o Postgres de produção no Supabase/Neon e rode:

   ```bash
   npx prisma migrate deploy
   ```

   Assim as tabelas (rooms, participants, spin_history, impediments) ficam criadas/atualizadas em prod.

6. **Domínio**: Vercel gera um `*.vercel.app`; você pode configurar um domínio próprio nas configurações do projeto.

---

## 4. Opção B: VPS ou servidor (Node)

Se for usar um VPS (DigitalOcean, AWS, etc.) ou um servidor Node:

1. **No servidor** (Linux):

   ```bash
   git clone <seu-repositorio>
   cd daily-roulette
   npm ci
   ```

2. **Criar `.env`** com `DATABASE_URL` e `SESSION_SECRET` de produção.

3. **Migrations e build**:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   npm run build
   ```

4. **Rodar em produção**:

   ```bash
   npm run start
   ```

   Ou use **PM2** para manter o processo ativo:

   ```bash
   npm install -g pm2
   pm2 start npm --name "daily-roulette" -- start
   pm2 save && pm2 startup
   ```

5. **Nginx** (ou outro proxy) na frente: proxy para `http://localhost:3000` e SSL (ex: Let’s Encrypt).

---

## 5. Banco de dados em produção

- **Supabase**: crie um projeto, pegue a connection string em Settings → Database (use “Connection string” com senha).
- **Neon**: crie um projeto e use a URL de connection.
- **Railway**: crie um serviço Postgres e use a variável `DATABASE_URL` que eles fornecem.

Use sempre uma **URL de produção** (e, se possível, um banco separado do desenvolvimento). Não suba o `.env` para o Git.

### Erro em produção: "Tenant or user not found" (Supabase)

Se em produção aparecer **500** e no console do navegador algo como `FATAL: Tenant or user not found` ou `DATABASE_UNAVAILABLE`, a aplicação não está conseguindo conectar ao Postgres. No **Supabase** isso costuma ser:

1. **Formato do usuário** — O Supabase identifica o projeto pelo usuário. Use a URL **exata** do painel: **Project Settings → Database → Connection string**. Para o **Session pooler** (porta 6543), o usuário deve ser `postgres.[project_ref]` (ex: `postgres.htnzmjxayxdeqrtispvf`), não só `postgres`.
2. **Host do pooler** — Copie o host do painel (ex: `aws-0-us-east-1.pooler.supabase.com`). Não use um host genérico.
3. **Projeto pausado ou senha alterada** — Se o projeto foi pausado e reativado, ou a senha do banco foi alterada, atualize a `DATABASE_URL` em produção (ex: Vercel → Environment Variables) com a nova connection string do Supabase e faça um novo deploy.
4. **Variável em produção** — Confirme que `DATABASE_URL` está definida no ambiente de **produção** do seu provedor e que o valor é a URL de **produção** do Supabase, não de outro projeto ou de desenvolvimento.

---

## 6. Checklist final

- [ ] `DATABASE_URL` e `SESSION_SECRET` configurados no ambiente de produção.
- [ ] `prisma migrate deploy` executado no banco de produção.
- [ ] Build passando (`npm run build`).
- [ ] Testar login na sala, roleta, impedimentos e áudio em produção.

Depois disso, o app está publicado em prod.
