# Migração de persistência: Supabase Cloud → MongoDB Atlas (aplicação continua na Vercel)

## Contexto e motivação

O projeto roda hoje na Vercel com Supabase Cloud (PostgREST via `@supabase/supabase-js`). O problema relatado — "o Supabase trava o banco" — foi diagnosticado como o auto-pause do plano gratuito do Supabase: o projeto pausa sozinho após um período de inatividade e precisa ser reativado manualmente no dashboard.

Decisão tomada: em vez de hospedar a aplicação e o banco em uma VPS particular (caminho explorado e planejado anteriormente, ver `2026-07-02-migracao-postgres-selfhosted-design.md`), a aplicação continua na Vercel e apenas a camada de persistência muda, para MongoDB Atlas (gerenciado). Motivação dupla: (1) o tier gratuito do Atlas (M0) não tem o comportamento de auto-pause do Supabase, resolvendo o problema relatado sem custo adicional; (2) familiaridade prévia do usuário com MongoDB.

Este documento substitui, para efeitos de próximos passos, a direção de hospedagem em VPS — o trabalho de Docker/Caddy feito anteriormente fica preservado no repositório mas não é usado por ora.

## Escopo

Inclui:
- Todas as tabelas de domínio (`pacientes`, `consultas`) e de autenticação (`profiles`, `users`, `password_reset_tokens`, `account_unlock_tokens`), migradas juntas em uma única leva
- Todos os repositórios que hoje implementam `ConsultaRepository`, `PacienteRepository`, `UserRepository`, `AuthTokenRepository`
- `unlockPassword.ts`
- Migração dos dados existentes do Supabase Cloud para o MongoDB Atlas

Não inclui:
- Mudanças na camada de aplicação (`src/application/**`) — as interfaces em `ports.ts` e `auth/ports.ts` são agnósticas de infraestrutura e não mudam
- Hospedagem em VPS (descartada nesta direção)
- Mudanças de UI/UX
- Persistência JSON de dev (`PERSISTENCE=json`) — continua existindo como fallback

## Arquitetura

### Novo módulo `src/infrastructure/mongo/`

- **`connection.ts`** — conexão Mongoose única, cacheada em variável global entre invocações de função serverless (padrão oficial recomendado pelo próprio Mongoose para Next.js/Vercel — evita abrir uma conexão nova a cada invocação e esgotar o limite de conexões do Atlas).
- **`models.ts`** — schemas e models Mongoose: `Paciente`, `Consulta`, `User`, `Profile`, `PasswordResetToken`, `AccountUnlockToken`.

### Modelagem de dados

- `pacientes` e `consultas` continuam como collections separadas (não embutidas), com `consultas.patient_id` referenciando `pacientes._id` — mesma relação lógica de hoje. Justificativa: `ConsultaRepository.findById(id)` e `.delete(id)` recebem apenas o id da consulta (sem o id do paciente) nas interfaces atuais; embutir consultas dentro do documento paciente exigiria buscar em todos os documentos por um id aninhado, mais caro e mais complexo do que hoje.
- `_id` de `pacientes` e `consultas` é o próprio `id` (string) já gerado pela aplicação — evita manter duas chaves (a `id` do domínio e um `_id` do Mongo) apontando para a mesma entidade.
- `users`, `password_reset_tokens`, `account_unlock_tokens` usam `ObjectId` padrão do Mongoose para `_id` — no Postgres esses ids já eram gerados pelo banco (`gen_random_uuid()`), e nenhum código depende do formato UUID especificamente (as interfaces em `auth/ports.ts` tipam `id` como `string` genérico).
- `profiles` usa `user_id` como identificador (chave primária lógica, com índice único), pois é uma relação 1:1 com `users`.
- Índice único composto `{ user_id: 1, identificador: 1 }` em `pacientes`, substituindo a unique constraint do Postgres (`idx_pacientes_user_id_identificador`).
- Isolamento multi-tenant continua sendo feito no código dos repositórios (filtro explícito por `user_id` em cada query) — mesma estratégia de hoje, sem equivalente a RLS no MongoDB.

### Repositórios reescritos

Mesma interface pública (`ports.ts` / `auth/ports.ts`) — nenhuma mudança na camada de aplicação:

| Arquivo atual | Novo arquivo |
|---|---|
| `ConsultaRepositorySupabase.ts` | `ConsultaRepositoryMongo.ts` |
| `PacienteRepositorySupabase.ts` | `PacienteRepositoryMongo.ts` |
| `UserRepositorySupabase.ts` | `UserRepositoryMongo.ts` |
| `AuthTokenRepositorySupabase.ts` | `AuthTokenRepositoryMongo.ts` |

`unlockPassword.ts` é reescrito para operar sobre os models Mongoose em vez de `SupabaseClient<Database>`, mantendo a mesma assinatura pública (`getUnlockPasswordHash`, `setUnlockPassword`, `hashPassword`, `verifyUnlockPassword`).

### Removido

Mesmo levantamento de código morto feito na investigação anterior, ainda válido aqui:
- `src/infrastructure/supabase/createSupabaseClientForUser.ts` (JWT/RLS não usado em produção)
- `src/infrastructure/supabase/client.ts` (client browser não usado em nenhum lugar)
- `src/infrastructure/supabase/server.ts`, `src/infrastructure/supabase/database.types.ts`
- Dependências `@supabase/supabase-js` e `@supabase/ssr` do `package.json`
- `test-db.ts` (script de debug avulso na raiz do projeto, com credenciais do Supabase hardcoded)
- `scripts/migrate-json-to-supabase.ts` (obsoleto — não há mais Supabase para migrar)
- `supabase/migrations/*.sql` (schema relacional não se aplica mais)

### Wiring (injeção de dependência)

- `src/infrastructure/container.ts`: a checagem `process.env.PERSISTENCE === "supabase"` passa a ser `=== "mongo"`; os construtores de repositório passam a receber a conexão Mongoose em vez do `SupabaseClient`.
- `src/infrastructure/auth-container.ts`: constrói `UserRepositoryMongo`/`AuthTokenRepositoryMongo`.
- `app/auth.ts` (`getSessionContext`/`getSession`): o campo hoje chamado `supabaseClient` é renomeado para `db` (mesmo racional da investigação anterior — manter o nome antigo seria enganoso). Consumidores em `app/actions.ts`, `app/avaliacao/[id]/desbloquear/page.tsx`, `app/configuracoes/page.tsx` e `app/api/avaliacao/[id]/pdf/route.ts` são atualizados de acordo.

## Variáveis de ambiente

Nova:
- `MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/avaliacao?retryWrites=true&w=majority`

Removidas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_JWT_KID`, `SUPABASE_JWT_SECRET_IS_BASE64`

Renomeada: `PERSISTENCE=supabase` → `PERSISTENCE=mongo` (valor `json` continua igual para dev)

Aplicado em `.env.example`, nas variáveis de ambiente do projeto na Vercel (dashboard), e em `CLAUDE.md`.

## Migração dos dados existentes

Diferente da migração para Postgres self-hosted (que usava `pg_dump`/`pg_restore` porque o motor de origem e destino era o mesmo), aqui os motores são diferentes — a migração é feita por um script one-off (`scripts/migrate-supabase-to-mongo.ts`) que:
1. Lê todos os registros de cada tabela via o client Supabase atual (reaproveitando `@supabase/supabase-js` só neste script, antes de a dependência ser removida do projeto)
2. Grava os documentos correspondentes nas collections Mongoose novas, preservando os mesmos ids (string) usados hoje

Esse script roda uma única vez, contra o Supabase de produção (leitura) e o MongoDB Atlas novo (escrita), antes do corte de tráfego (troca da variável de ambiente `PERSISTENCE`/`MONGODB_URI` na Vercel).

## Testes

- Testes de integração dos repositórios usam `mongodb-memory-server` (`mongod` real embutido, sem dependência de Docker) em vez do Postgres efêmero via Docker usado na direção anterior.
- Os 51 testes unitários existentes (`vitest run`) não tocam infraestrutura e não são afetados.

## Documentação

`CLAUDE.md` é atualizado para refletir: `PERSISTENCE=json|mongo`, novo arquivo-chave `src/infrastructure/mongo/connection.ts`/`models.ts`, e remoção das referências ao Supabase.

## Riscos e mitigação

- **Downtime durante o corte de dados**: a app fica totalmente indisponível durante a execução do script de ETL e a troca de variáveis de ambiente na Vercel (sem modo somente-leitura — fora de escopo). Mitigação: janela curta, fora de horário de uso, e validação de contagem de documentos por collection antes de apontar a app para o Mongo novo.
- **Perda de garantias relacionais**: FK/cascade delete do Postgres não têm equivalente automático no MongoDB — o único ponto onde isso importava na prática é a exclusão de um paciente (que hoje nem tem um método de delete exposto em `PacienteRepository`), então o risco real é baixo; ainda assim, documentar explicitamente que exclusão de paciente (se implementada no futuro) precisa apagar as consultas associadas manualmente no código.
- **Esgotamento de conexões do Atlas a partir de funções serverless da Vercel**: mitigado pelo padrão de conexão cacheada em `connection.ts` (reaproveita a conexão entre invocações "quentes" da mesma função).
- **Regressão silenciosa em query específica**: como os repositórios são reescritos do zero (de PostgREST/SQL para Mongoose), cada método precisa ser comparado com o comportamento atual — especialmente paginação em `listarPaginado`, busca case-insensitive em `findByIdentificador`, e a query de `getUltimaConsultaAntesDe`.
