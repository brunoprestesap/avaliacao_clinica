# Migração de persistência: Supabase Cloud → Postgres self-hosted (VPS)

## Contexto e motivação

O projeto hoje roda na Vercel com Supabase Cloud (PostgREST via `@supabase/supabase-js`). A decisão é migrar para hospedagem própria em VPS particular, incluindo o próprio banco de dados — não apenas a aplicação Next.js.

A camada de persistência atual está acoplada à API REST do Supabase (PostgREST) e a um mecanismo de RLS via JWT customizado (`createSupabaseClientForUser.ts`). Investigação no código mostrou que esse mecanismo de RLS/JWT nunca é chamado em produção — todos os repositórios usam o client de service role (`getSupabase()`), com isolamento por `userId` feito explicitamente em cada repositório (conforme já documentado no `CLAUDE.md`). O client browser (`supabase/client.ts`) também não é importado em nenhum lugar. Ambos são código morto.

As tabelas (`pacientes`, `consultas`, `profiles`, `public.users`, `password_reset_tokens`, `account_unlock_tokens`) já não dependem de `auth.users` do Supabase — a migração `20250302110000` já trocou as FKs para `public.users`. Isso significa que o schema é, na prática, Postgres puro; a dependência real do Supabase está apenas na camada de acesso (client PostgREST) e nas políticas de RLS (que dependem de `auth.uid()`, inexistente em Postgres puro, e já eram vestigiais).

## Escopo

Inclui:
- Todas as tabelas de domínio (`pacientes`, `consultas`) e de autenticação (`profiles`, `users`, `password_reset_tokens`, `account_unlock_tokens`)
- Todos os repositórios que hoje implementam `ConsultaRepository`, `PacienteRepository`, `UserRepository`, `AuthTokenRepository`
- `unlockPassword.ts` (senha de desbloqueio da equipe de saúde)
- Infra Docker (Postgres em container na VPS) e migração de dados do Supabase Cloud atual

Não inclui (fora do escopo desta spec):
- Mudanças na camada de aplicação (`src/application/**`) — as interfaces em `ports.ts` e `auth/ports.ts` já são agnósticas de infraestrutura e não mudam
- Mudanças de UI/UX
- Persistência JSON de dev (`PERSISTENCE=json`) — continua existindo como fallback, sem alterações

## Arquitetura

### Novo módulo `src/infrastructure/db/`

- **`schema.ts`** — definições Drizzle das tabelas, traduzidas 1:1 do `database.types.ts` atual (`pacientes`, `consultas`, `profiles`, `users`, `password_reset_tokens`, `account_unlock_tokens`). Os tipos de linha (`Row`/`Insert`) passam a ser inferidos automaticamente pelo Drizzle (`InferSelectModel`/`InferInsertModel`), substituindo os tipos hoje escritos manualmente em `database.types.ts`.
- **`client.ts`** — singleton do client Drizzle usando o driver `postgres.js`, conectado via `DATABASE_URL`. Único ponto de criação de conexão com o banco (equivalente ao atual `getSupabase()` em `supabase/server.ts`).

### Repositórios reescritos

Mesma interface pública (`ports.ts` / `auth/ports.ts`) — nenhuma mudança na camada de aplicação:

| Arquivo atual | Novo arquivo |
|---|---|
| `ConsultaRepositorySupabase.ts` | `ConsultaRepositoryPostgres.ts` |
| `PacienteRepositorySupabase.ts` | `PacienteRepositoryPostgres.ts` |
| `UserRepositorySupabase.ts` | `UserRepositoryPostgres.ts` |
| `AuthTokenRepositorySupabase.ts` | `AuthTokenRepositoryPostgres.ts` |

`unlockPassword.ts` é reescrito para receber o client Drizzle como parâmetro em vez de `SupabaseClient<Database>`, mantendo a mesma assinatura pública (`getUnlockPasswordHash`, `setUnlockPassword`, `hashPassword`, `verifyUnlockPassword`).

### Removido

Código morto ou específico do Supabase, sem substituto necessário:
- `src/infrastructure/supabase/createSupabaseClientForUser.ts` (JWT/RLS não usado)
- `src/infrastructure/supabase/client.ts` (client browser não usado)
- `src/infrastructure/supabase/server.ts` (substituído por `db/client.ts`)
- `src/infrastructure/supabase/database.types.ts` (substituído pelos tipos inferidos do Drizzle)
- Dependências `@supabase/supabase-js` e `@supabase/ssr` do `package.json`
- Políticas de RLS das migrações atuais (dependiam de `auth.uid()`)

### Wiring (injeção de dependência)

- `src/infrastructure/container.ts`: a checagem `process.env.PERSISTENCE === "supabase"` passa a ser `=== "postgres"`; os construtores de repositório passam a receber o client Drizzle em vez do `SupabaseClient`.
- `src/infrastructure/auth-container.ts`: constrói `UserRepositoryPostgres`/`AuthTokenRepositoryPostgres` com o client Drizzle.
- `app/auth.ts` (`getSessionContext`/`getSession`): `supabaseClient` no retorno passa a ser o client Drizzle (tipo trocado de `SupabaseClient<Database>` para o tipo do client Drizzle). Os únicos consumidores são `app/actions.ts` (chamadas a `getUnlockPasswordHash`/`setUnlockPassword`), que recebem o novo client sem mudança de assinatura de alto nível.

## Variáveis de ambiente

Nova:
- `DATABASE_URL=postgresql://usuario:senha@db:5432/avaliacao` (`db` é o nome do serviço no `docker-compose.yml`)

Removidas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_JWT_KID`, `SUPABASE_JWT_SECRET_IS_BASE64`

Renomeada: `PERSISTENCE=supabase` → `PERSISTENCE=postgres` (valor `json` continua igual para dev)

Isso se aplica a `.env.example`, `.env.production` (já criado para a VPS) e `CLAUDE.md`.

## Infraestrutura Docker

`docker-compose.yml` ganha um serviço `db`:
- Imagem `postgres:17-alpine` (ou versão compatível com o dump exportado do Supabase — validado no passo de migração de dados)
- Volume nomeado (`pgdata`) para persistência
- Healthcheck (`pg_isready`)
- `app` declara `depends_on: db: condition: service_healthy`

## Schema e migrations

`drizzle-kit` substitui os arquivos hoje em `supabase/migrations/*.sql` como ferramenta de migração, gerando SQL a partir de `schema.ts`. As migrações resultantes recriam o schema atual (tabelas, colunas, índices, constraints, FKs) **sem** as políticas de RLS. As migrações do Drizzle rodam antes da aplicação subir (passo explícito no processo de deploy — detalhado no plano de implementação).

## Migração dos dados existentes

Caminho escolhido: `pg_dump` da connection string direta do Supabase (Settings → Database, não a URL do PostgREST) → `pg_restore`/`psql` no container Postgres novo, na VPS, numa janela de corte única. Por ambos os lados rodarem o mesmo motor Postgres, esse caminho preserva dados e tipos sem transformação.

## Testes

- `auth-repositories.integration.test.ts` (hoje gated por `INTEGRATION_SUPABASE=1` + client Supabase) passa a rodar contra um Postgres real local (ex.: container Docker efêmero), sem gate específico de Supabase.
- Os 51 testes unitários existentes (`vitest run`) não tocam infraestrutura e não são afetados.

## Documentação

`CLAUDE.md` é atualizado para refletir: `PERSISTENCE=json|postgres` (não mais `supabase`), novo arquivo-chave `src/infrastructure/db/client.ts` no lugar de `container.ts`'s menção ao Supabase, e a remoção da menção a "cliente Supabase server-side usa service role key".

## Riscos e mitigação

- **Downtime durante o corte de dados**: a app fica totalmente indisponível durante o `pg_dump`/`pg_restore` (sem modo somente-leitura — fora de escopo). Mitigação: janela curta, fora de horário de uso, e validação de contagem de linhas em cada tabela antes de apontar a app para o banco novo.
- **Compatibilidade de versão do Postgres**: validar a versão do Postgres do projeto Supabase (`SELECT version()`) antes de escolher a tag da imagem `postgres` na VPS.
- **Regressão silenciosa em query específica**: como os repositórios são reescritos do zero (de PostgREST para SQL/Drizzle), cada método precisa ser comparado com o comportamento atual (especialmente paginação em `listarPaginado` e a query de `getUltimaConsultaAntesDe`, que hoje usa `.lt("date")/.not("clinico").limit(1)` diretamente no Postgres via PostgREST).
