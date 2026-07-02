# Migração Supabase Cloud → Postgres self-hosted — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a camada de persistência do projeto (Supabase Cloud via PostgREST) por Postgres self-hosted em container Docker na VPS, usando Drizzle ORM, sem alterar a camada de aplicação.

**Architecture:** Novo módulo `src/infrastructure/db/` (schema Drizzle + client singleton via driver `postgres.js`) substitui `src/infrastructure/supabase/`. Cada repositório `*Supabase.ts` é reescrito como `*Postgres.ts` implementando a mesma interface de `ports.ts`/`auth/ports.ts`. O container Postgres roda como serviço `db` no `docker-compose.yml` já existente.

**Tech Stack:** drizzle-orm ^0.45.2, drizzle-kit ^0.31.10 (dev), postgres (postgres.js) ^3.4.9, postgres:17-alpine (imagem Docker).

## Global Constraints

- Node 24, Next.js 16 App Router, TypeScript strict (`tsconfig.json` já configurado, não alterar).
- Nenhuma mudança em `src/application/ports.ts` ou `src/application/auth/ports.ts` — as interfaces já são agnósticas de infraestrutura.
- `npm test` (vitest) deve passar ao final de cada task.
- `npm run build` deve passar ao final da Task 7 e novamente ao final da Task 8.
- Toda tabela/coluna nova deve ter o mesmo nome (snake_case) das colunas atuais do Postgres do Supabase, documentadas em `src/infrastructure/supabase/database.types.ts` — sem renomear nada no schema.
- `fase_indicada` é armazenado como `text` contendo a representação em string do código numérico (`"1"`, `"2"`, `"4"`) OU o rótulo por extenso (`"Integral"`, `"Núcleo"`, `"Essência"`) para linhas antigas — comportamento legado que deve ser preservado exatamente como está em `ConsultaRepositorySupabase.ts` (ver Task 4).

---

### Task 1: Schema Drizzle + client + configuração de migrations

**Files:**
- Create: `src/infrastructure/db/schema.ts`
- Create: `src/infrastructure/db/client.ts`
- Create: `drizzle.config.ts` (raiz do projeto)
- Modify: `package.json` (dependências)
- Create: `drizzle/migrations/` (gerado por `drizzle-kit generate`, não escrito à mão)

**Interfaces:**
- Produces: `export const pacientes, consultas, profiles, users, password_reset_tokens, account_unlock_tokens` (tabelas Drizzle) em `db/schema.ts`; `export type DbClient` e `export function getDb(): DbClient` em `db/client.ts`. Tasks 3-9 consomem `DbClient`, `getDb` e as tabelas exportadas.

- [ ] **Step 1: Instalar dependências**

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

- [ ] **Step 2: Escrever o schema Drizzle**

Criar `src/infrastructure/db/schema.ts`:

```ts
import { pgTable, text, integer, jsonb, timestamp, uuid, index, uniqueIndex } from "drizzle-orm/pg-core";
import type { ClinicoResultado, ComparacaoResultado, EstruturaResultado } from "@/src/domain";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash"),
  email_verified: timestamp("email_verified", { withTimezone: true, mode: "string" }),
  failed_login_attempts: integer("failed_login_attempts").default(0).notNull(),
  locked_until: timestamp("locked_until", { withTimezone: true, mode: "string" }),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const pacientes = pgTable(
  "pacientes",
  {
    id: text("id").primaryKey(),
    nome: text("nome").notNull(),
    identificador: text("identificador").notNull(),
    user_id: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("idx_pacientes_user_id").on(table.user_id),
    uniqueIndex("idx_pacientes_user_id_identificador").on(table.user_id, table.identificador),
  ]
);

export const consultas = pgTable(
  "consultas",
  {
    id: text("id").primaryKey(),
    patient_id: text("patient_id")
      .notNull()
      .references(() => pacientes.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    clinico: jsonb("clinico").$type<ClinicoResultado | null>(),
    estrutura: jsonb("estrutura").$type<EstruturaResultado | null>(),
    fase_indicada: text("fase_indicada"),
    impressao_clinica: text("impressao_clinica"),
    comparacao: jsonb("comparacao").$type<ComparacaoResultado | null>(),
  },
  (table) => [
    index("idx_consultas_patient_id").on(table.patient_id),
    index("idx_consultas_patient_id_date").on(table.patient_id, table.date),
  ]
);

export const profiles = pgTable("profiles", {
  user_id: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  unlock_password_hash: text("unlock_password_hash").notNull(),
  unlock_password_salt: text("unlock_password_salt").notNull(),
});

export const password_reset_tokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token_hash: text("token_hash").notNull(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires_at: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_password_reset_tokens_user_id").on(table.user_id),
    index("idx_password_reset_tokens_expires_at").on(table.expires_at),
  ]
);

export const account_unlock_tokens = pgTable(
  "account_unlock_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    token_hash: text("token_hash").notNull(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires_at: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_account_unlock_tokens_user_id").on(table.user_id),
    index("idx_account_unlock_tokens_expires_at").on(table.expires_at),
  ]
);
```

Nota: colunas de timestamp usam `mode: "string"` — Drizzle retorna/aceita ISO strings diretamente, igual ao comportamento atual do PostgREST (que já serializa timestamps como string JSON). Isso evita conversões `Date ↔ string` nos repositórios (as interfaces em `auth/ports.ts` usam `string`, não `Date`).

- [ ] **Step 3: Client Drizzle**

Criar `src/infrastructure/db/client.ts`:

```ts
import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type DbClient = ReturnType<typeof drizzle<typeof schema>>;

let queryClient: ReturnType<typeof postgres> | null = null;
let dbInstance: DbClient | null = null;

/**
 * Único ponto de criação do client Postgres no servidor.
 * Equivalente ao antigo getSupabase() — singleton, lança erro se DATABASE_URL ausente.
 */
export function getDb(): DbClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Missing DATABASE_URL.");
  }
  if (!dbInstance) {
    queryClient = postgres(connectionString, { max: 10 });
    dbInstance = drizzle(queryClient, { schema });
  }
  return dbInstance;
}
```

- [ ] **Step 4: Configuração do drizzle-kit**

Criar `drizzle.config.ts` na raiz do projeto:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/infrastructure/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 5: Subir um Postgres efêmero local para validar o schema**

```bash
docker run --rm -d --name avaliacao-schema-test -p 5433:5432 \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=avaliacao_test \
  postgres:17-alpine
sleep 2
```

- [ ] **Step 6: Gerar e aplicar a migração inicial**

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/avaliacao_test"
npx drizzle-kit generate
npx drizzle-kit migrate
```

Expected: `drizzle-kit generate` cria um arquivo `.sql` em `drizzle/migrations/0000_*.sql` com `CREATE TABLE` para as 6 tabelas. `drizzle-kit migrate` aplica sem erro e cria a tabela de controle `__drizzle_migrations`.

- [ ] **Step 7: Verificar as tabelas criadas**

```bash
docker exec avaliacao-schema-test psql -U postgres -d avaliacao_test -c "\dt"
```

Expected: lista `account_unlock_tokens`, `consultas`, `pacientes`, `password_reset_tokens`, `profiles`, `users` (+ `__drizzle_migrations`).

- [ ] **Step 8: Encerrar o Postgres efêmero**

```bash
docker stop avaliacao-schema-test
unset DATABASE_URL
```

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/infrastructure/db drizzle.config.ts drizzle
git commit -m "feat: adiciona schema Drizzle e client Postgres"
```

---

### Task 2: Serviço `db` no docker-compose + variáveis de ambiente

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.example`
- Modify: `.env.production`

**Interfaces:**
- Consumes: nenhuma (task de infraestrutura pura).
- Produces: serviço `db` acessível em `db:5432` a partir do serviço `app` dentro da rede `internal` do compose. `DATABASE_URL` no formato `postgresql://<user>:<senha>@db:5432/<database>`.

- [ ] **Step 1: Adicionar o serviço `db` ao `docker-compose.yml`**

Ler o arquivo atual antes de editar. Adicionar o serviço `db` e fazer `app` depender dele saudável:

```yaml
services:
  app:
    build: .
    restart: unless-stopped
    env_file:
      - .env.production
    expose:
      - "3000"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - internal

  db:
    image: postgres:17-alpine
    restart: unless-stopped
    env_file:
      - .env.production
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U avaliacao"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - internal

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - internal
    depends_on:
      - app

networks:
  internal:

volumes:
  caddy_data:
  caddy_config:
  pgdata:
```

Nota: `db` usa `env_file: .env.production` (o mesmo arquivo do `app`) para ler `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB` — a imagem oficial `postgres` lê essas três variáveis nativamente para se auto-inicializar. O healthcheck usa `avaliacao` fixo porque é o valor que vamos definir para `POSTGRES_USER` no Step 3.

- [ ] **Step 2: Atualizar `.env.example`**

Substituir o bloco de variáveis do Supabase por Postgres. Remover as linhas:
```
# Supabase (obrigatório quando PERSISTENCE=supabase e para auth)
# NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
# SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
# JWT secret do projeto (Dashboard → Settings → API → JWT Secret). Necessário para RLS com sessão NextAuth.
# SUPABASE_JWT_SECRET=seu-jwt-secret
# Se o JWT secret estiver em base64 (depende da configuração do projeto), habilite:
# SUPABASE_JWT_SECRET_IS_BASE64=true
# Se o seu projeto Supabase estiver usando Signing Keys e exigir kid no header:
# SUPABASE_JWT_KID=seu-kid
```

Adicionar no lugar:
```
# Postgres (obrigatório quando PERSISTENCE=postgres)
# DATABASE_URL=postgresql://avaliacao:senha-forte@db:5432/avaliacao
# Usadas apenas pelo container oficial do Postgres para auto-inicializar (docker-compose) —
# devem corresponder exatamente ao usuário/senha/banco usados em DATABASE_URL acima.
# POSTGRES_USER=avaliacao
# POSTGRES_PASSWORD=senha-forte
# POSTGRES_DB=avaliacao
```

E trocar a primeira linha do arquivo:
```
# Persistência: "json" (padrão, usa data/*.json) ou "supabase"
# Em produção (VPS/Docker), defina PERSISTENCE=supabase explicitamente —
# sem isso o container grava dados em data/*.json dentro da própria imagem.
# PERSISTENCE=json
```
por:
```
# Persistência: "json" (padrão, usa data/*.json) ou "postgres"
# Em produção (VPS/Docker), defina PERSISTENCE=postgres explicitamente —
# sem isso o container grava dados em data/*.json dentro da própria imagem.
# PERSISTENCE=json
```

- [ ] **Step 3: Atualizar `.env.production`**

Este arquivo é local, ignorado pelo git (`.gitignore` já cobre `.env*`) e contém segredos reais — editar diretamente, sem exibir o conteúdo em terminal/log. Remover as linhas `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` (e `SUPABASE_JWT_KID`/`SUPABASE_JWT_SECRET_IS_BASE64` se presentes). Mudar `PERSISTENCE=supabase` para `PERSISTENCE=postgres`. Adicionar:

```
POSTGRES_USER=avaliacao
POSTGRES_PASSWORD=<gerar uma senha forte, ex.: openssl rand -base64 24>
POSTGRES_DB=avaliacao
DATABASE_URL=postgresql://avaliacao:<mesma senha de POSTGRES_PASSWORD>@db:5432/avaliacao
```

Gerar a senha com:
```bash
openssl rand -base64 24
```

- [ ] **Step 4: Validar subindo o serviço `db` isolado**

```bash
docker compose up -d db
sleep 3
docker compose ps db
docker compose exec db pg_isready -U avaliacao
```

Expected: `docker compose ps db` mostra status `healthy`; `pg_isready` retorna `accepting connections`.

- [ ] **Step 5: Aplicar as migrations Drizzle contra o `db` do compose**

```bash
export DATABASE_URL="postgresql://avaliacao:<senha usada no .env.production>@localhost:5432/avaliacao"
```

Como o serviço `db` não expõe porta ao host por padrão (só à rede `internal`), adicionar temporariamente `ports: ["5432:5432"]` ao serviço `db` no `docker-compose.yml` **apenas para este passo de validação local**, rodar `docker compose up -d db`, aplicar `npx drizzle-kit migrate`, depois remover a porta exposta (não deixar Postgres exposto publicamente na VPS).

```bash
npx drizzle-kit migrate
docker compose exec db psql -U avaliacao -d avaliacao -c "\dt"
```

Expected: mesmas 6 tabelas do Step 7 da Task 1.

- [ ] **Step 6: Encerrar e remover a porta temporária**

```bash
docker compose down
unset DATABASE_URL
```

Confirmar que a linha `ports: ["5432:5432"]` foi removida do `docker-compose.yml` antes de commitar.

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: adiciona serviço Postgres ao docker-compose e variáveis de ambiente"
```

(`.env.production` não é commitado — está no `.gitignore`.)

---

### Task 3: `PacienteRepositoryPostgres`

**Files:**
- Create: `src/infrastructure/repositories/PacienteRepositoryPostgres.ts`
- Create: `src/infrastructure/repositories/PacienteRepositoryPostgres.integration.test.ts`
- Delete: `src/infrastructure/repositories/PacienteRepositorySupabase.ts` (ao final, depois do teste passar)

**Interfaces:**
- Consumes: `DbClient`, `getDb` de `@/src/infrastructure/db/client`; tabela `pacientes` de `@/src/infrastructure/db/schema`; `PacienteRepository` de `@/src/application/ports`; `Paciente` de `@/src/domain`.
- Produces: `export class PacienteRepositoryPostgres implements PacienteRepository` com o mesmo construtor `(db: DbClient, userId?: string)` do antigo `PacienteRepositorySupabase`. Consumido por `container.ts` na Task 7.

- [ ] **Step 1: Escrever o teste de integração (falhando)**

Criar `src/infrastructure/repositories/PacienteRepositoryPostgres.integration.test.ts`:

```ts
/**
 * Testes de integração para PacienteRepositoryPostgres.
 * Rodam apenas quando INTEGRATION_POSTGRES=1 e DATABASE_URL apontam para um Postgres real
 * com as migrations do Drizzle aplicadas (ex.: docker run postgres:17-alpine + drizzle-kit migrate).
 *
 * Executar com: INTEGRATION_POSTGRES=1 DATABASE_URL=postgresql://postgres:postgres@localhost:5433/avaliacao_test npm run test -- PacienteRepositoryPostgres.integration
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import * as schema from "@/src/infrastructure/db/schema";
import { PacienteRepositoryPostgres } from "./PacienteRepositoryPostgres";

const runIntegration = process.env.INTEGRATION_POSTGRES === "1" && !!process.env.DATABASE_URL;

describe.skipIf(!runIntegration)("PacienteRepositoryPostgres (integration)", () => {
  let client: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let userId: string;

  beforeAll(async () => {
    client = postgres(process.env.DATABASE_URL!, { max: 1 });
    db = drizzle(client, { schema });
    const [user] = await db
      .insert(schema.users)
      .values({ email: `paciente-repo-${Date.now()}@test.local`, password_hash: null })
      .returning({ id: schema.users.id });
    userId = user.id;
  });

  afterEach(async () => {
    await db.delete(schema.pacientes).where(eq(schema.pacientes.user_id, userId));
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    await client.end();
  });

  it("save + findById retornam o paciente", async () => {
    const repo = new PacienteRepositoryPostgres(db, userId);
    const id = randomUUID();
    await repo.save({ id, nome: "Ana Silva", identificador: "PRONT-001" });
    const found = await repo.findById(id);
    expect(found).toEqual({ id, nome: "Ana Silva", identificador: "PRONT-001" });
  });

  it("findByIdentificador é case-insensitive", async () => {
    const repo = new PacienteRepositoryPostgres(db, userId);
    const id = randomUUID();
    await repo.save({ id, nome: "Bruno Costa", identificador: "PRONT-002" });
    const found = await repo.findByIdentificador("pront-002");
    expect(found?.id).toBe(id);
  });

  it("listarPaginado filtra por query e retorna total", async () => {
    const repo = new PacienteRepositoryPostgres(db, userId);
    await repo.save({ id: randomUUID(), nome: "Carla Dias", identificador: "PRONT-010" });
    await repo.save({ id: randomUUID(), nome: "Outra Pessoa", identificador: "PRONT-011" });
    const { pacientes, total } = await repo.listarPaginado(0, 10, "Carla");
    expect(total).toBe(1);
    expect(pacientes[0].nome).toBe("Carla Dias");
  });

  it("findById não retorna paciente de outro usuário", async () => {
    const [outroUser] = await db
      .insert(schema.users)
      .values({ email: `outro-${Date.now()}@test.local`, password_hash: null })
      .returning({ id: schema.users.id });
    const repoOutro = new PacienteRepositoryPostgres(db, outroUser.id);
    const id = randomUUID();
    await repoOutro.save({ id, nome: "Paciente Isolado", identificador: "PRONT-020" });

    const repo = new PacienteRepositoryPostgres(db, userId);
    const found = await repo.findById(id);
    expect(found).toBeNull();

    await db.delete(schema.users).where(eq(schema.users.id, outroUser.id));
  });
});
```

- [ ] **Step 2: Subir Postgres efêmero e rodar o teste (esperado: falhar por módulo inexistente)**

```bash
docker run --rm -d --name avaliacao-repo-test -p 5433:5432 \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=avaliacao_test \
  postgres:17-alpine
sleep 2
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/avaliacao_test"
npx drizzle-kit migrate
INTEGRATION_POSTGRES=1 npx vitest run src/infrastructure/repositories/PacienteRepositoryPostgres.integration.test.ts
```

Expected: FAIL — `Cannot find module './PacienteRepositoryPostgres'`.

- [ ] **Step 3: Implementar `PacienteRepositoryPostgres`**

Criar `src/infrastructure/repositories/PacienteRepositoryPostgres.ts`:

```ts
import { eq, and, ilike, or, sql, asc, type SQL } from "drizzle-orm";
import type { PacienteRepository } from "@/src/application/ports";
import type { Paciente } from "@/src/domain";
import type { DbClient } from "@/src/infrastructure/db/client";
import { pacientes } from "@/src/infrastructure/db/schema";

/** Escapa caracteres especiais do ILIKE no Postgres (%, _). */
function escapeIlikePattern(term: string): string {
  return term.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

function rowToPaciente(row: { id: string; nome: string; identificador: string }): Paciente {
  return { id: row.id, nome: row.nome, identificador: row.identificador };
}

export class PacienteRepositoryPostgres implements PacienteRepository {
  constructor(
    private db: DbClient,
    private userId?: string
  ) {}

  async save(paciente: Paciente, ownerId?: string): Promise<void> {
    const resolvedOwnerId = ownerId ?? this.userId ?? null;
    await this.db
      .insert(pacientes)
      .values({
        id: paciente.id,
        nome: paciente.nome,
        identificador: paciente.identificador,
        user_id: resolvedOwnerId,
      })
      .onConflictDoUpdate({
        target: pacientes.id,
        set: { nome: paciente.nome, identificador: paciente.identificador, user_id: resolvedOwnerId },
      });
  }

  async findById(id: string): Promise<Paciente | null> {
    const condition = this.userId
      ? and(eq(pacientes.id, id), eq(pacientes.user_id, this.userId))
      : eq(pacientes.id, id);
    const [row] = await this.db.select().from(pacientes).where(condition).limit(1);
    return row ? rowToPaciente(row) : null;
  }

  async findByIdentificador(identificador: string): Promise<Paciente | null> {
    const normalized = identificador.trim().toLowerCase();
    const condition: SQL | undefined = this.userId
      ? and(ilike(pacientes.identificador, normalized), eq(pacientes.user_id, this.userId))
      : ilike(pacientes.identificador, normalized);
    const [row] = await this.db.select().from(pacientes).where(condition).limit(1);
    if (!row) return null;
    const p = rowToPaciente(row);
    if (p.identificador.toLowerCase() !== normalized) return null;
    return p;
  }

  async listarTodos(): Promise<Paciente[]> {
    const condition = this.userId ? eq(pacientes.user_id, this.userId) : undefined;
    const rows = await this.db.select().from(pacientes).where(condition).orderBy(asc(pacientes.nome));
    return rows.map(rowToPaciente);
  }

  async listarPaginado(
    offset: number,
    limit: number,
    query?: string
  ): Promise<{ pacientes: Paciente[]; total: number }> {
    const conditions: SQL[] = [];
    if (this.userId) conditions.push(eq(pacientes.user_id, this.userId));
    if (query && query.trim() !== "") {
      const pattern = `%${escapeIlikePattern(query.trim())}%`;
      conditions.push(or(ilike(pacientes.nome, pattern), ilike(pacientes.identificador, pattern))!);
    }
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select()
      .from(pacientes)
      .where(whereCondition)
      .orderBy(asc(pacientes.nome))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(pacientes)
      .where(whereCondition);

    return { pacientes: rows.map(rowToPaciente), total: count };
  }
}
```

- [ ] **Step 4: Rodar o teste novamente (esperado: passar)**

```bash
INTEGRATION_POSTGRES=1 npx vitest run src/infrastructure/repositories/PacienteRepositoryPostgres.integration.test.ts
```

Expected: 4 testes passando.

- [ ] **Step 5: Encerrar o Postgres efêmero**

```bash
docker stop avaliacao-repo-test
unset DATABASE_URL
```

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/repositories/PacienteRepositoryPostgres.ts src/infrastructure/repositories/PacienteRepositoryPostgres.integration.test.ts
git commit -m "feat: implementa PacienteRepositoryPostgres com testes de integração"
```

Não apagar `PacienteRepositorySupabase.ts` ainda — ele é removido na Task 8, depois que `container.ts` parar de importá-lo (Task 7).

---

### Task 4: `ConsultaRepositoryPostgres`

**Files:**
- Create: `src/infrastructure/repositories/ConsultaRepositoryPostgres.ts`
- Create: `src/infrastructure/repositories/ConsultaRepositoryPostgres.integration.test.ts`

**Interfaces:**
- Consumes: `DbClient` de `@/src/infrastructure/db/client`; tabelas `consultas`, `pacientes` de `@/src/infrastructure/db/schema`; `ConsultaRepository` de `@/src/application/ports`; `Consulta`, `FaseIndicadaLabel` de `@/src/domain`.
- Produces: `export class ConsultaRepositoryPostgres implements ConsultaRepository` com construtor `(db: DbClient, userId?: string)`. Consumido por `container.ts` na Task 7.

- [ ] **Step 1: Escrever o teste de integração (falhando)**

Criar `src/infrastructure/repositories/ConsultaRepositoryPostgres.integration.test.ts`:

```ts
/**
 * Testes de integração para ConsultaRepositoryPostgres.
 * Executar com: INTEGRATION_POSTGRES=1 DATABASE_URL=postgresql://postgres:postgres@localhost:5433/avaliacao_test npm run test -- ConsultaRepositoryPostgres.integration
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import * as schema from "@/src/infrastructure/db/schema";
import { ConsultaRepositoryPostgres } from "./ConsultaRepositoryPostgres";
import { PacienteRepositoryPostgres } from "./PacienteRepositoryPostgres";

const runIntegration = process.env.INTEGRATION_POSTGRES === "1" && !!process.env.DATABASE_URL;

describe.skipIf(!runIntegration)("ConsultaRepositoryPostgres (integration)", () => {
  let client: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let userId: string;
  let patientId: string;

  beforeAll(async () => {
    client = postgres(process.env.DATABASE_URL!, { max: 1 });
    db = drizzle(client, { schema });
    const [user] = await db
      .insert(schema.users)
      .values({ email: `consulta-repo-${Date.now()}@test.local`, password_hash: null })
      .returning({ id: schema.users.id });
    userId = user.id;
    patientId = randomUUID();
    await new PacienteRepositoryPostgres(db, userId).save({
      id: patientId,
      nome: "Paciente Teste",
      identificador: "PRONT-CR-1",
    });
  });

  afterEach(async () => {
    await db.delete(schema.consultas).where(eq(schema.consultas.patient_id, patientId));
  });

  afterAll(async () => {
    await db.delete(schema.pacientes).where(eq(schema.pacientes.id, patientId));
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    await client.end();
  });

  it("save + findById fazem round-trip de clinico/estrutura/fase_indicada", async () => {
    const repo = new ConsultaRepositoryPostgres(db, userId);
    const id = randomUUID();
    await repo.save({
      id,
      patient_id: patientId,
      date: "2026-01-10",
      fase_indicada: "Núcleo",
      clinico: {
        itens: {
          C1: 1, C2: 1, C3: 1, C4: 1, C5: 1, C6: 1, C7: 1,
          C8: 1, C9: 1, C10: 1, C11: 1, C12: 1, C13: 1, C14: 0,
        },
        score_total: 13,
        classificacao: "CLINICO_LEVE",
        alerta_ideacao: false,
      },
    });
    const found = await repo.findById(id);
    expect(found?.fase_indicada).toBe("Núcleo");
    expect(found?.clinico?.score_total).toBe(13);
  });

  it("save rejeita paciente de outro usuário", async () => {
    const [outroUser] = await db
      .insert(schema.users)
      .values({ email: `outro-cr-${Date.now()}@test.local`, password_hash: null })
      .returning({ id: schema.users.id });
    const repoOutro = new ConsultaRepositoryPostgres(db, outroUser.id);
    await expect(
      repoOutro.save({ id: randomUUID(), patient_id: patientId, date: "2026-01-11" })
    ).rejects.toThrow("Acesso negado ao paciente");
    await db.delete(schema.users).where(eq(schema.users.id, outroUser.id));
  });

  it("getUltimaConsultaAntesDe retorna apenas consultas anteriores completas", async () => {
    const repo = new ConsultaRepositoryPostgres(db, userId);
    const consultaAntigaCompleta = {
      id: randomUUID(),
      patient_id: patientId,
      date: "2026-01-01",
      clinico: {
        itens: { C1: 0, C2: 0, C3: 0, C4: 0, C5: 0, C6: 0, C7: 0, C8: 0, C9: 0, C10: 0, C11: 0, C12: 0, C13: 0, C14: 0 as const },
        score_total: 0,
        classificacao: "CLINICO_ESTAVEL" as const,
        alerta_ideacao: false,
      },
      estrutura: {
        pilares: { P1: 4, P2: 4, P3: 4, P4: 4, P5: 4, P6: 4, P7: 4, P8: 4, P9: 4 as const },
        media: 4,
        classificacao: "ESTRUTURA_BEM_ESTRUTURADA" as const,
      },
    };
    const consultaSemEstrutura = { id: randomUUID(), patient_id: patientId, date: "2026-01-05" };
    const consultaAtual = { id: randomUUID(), patient_id: patientId, date: "2026-01-15" };
    await repo.save(consultaAntigaCompleta);
    await repo.save(consultaSemEstrutura);
    await repo.save(consultaAtual);

    const ultima = await repo.getUltimaConsultaAntesDe(patientId, consultaAtual.id);
    expect(ultima?.id).toBe(consultaAntigaCompleta.id);
  });

  it("delete é idempotente quando a consulta não existe", async () => {
    const repo = new ConsultaRepositoryPostgres(db, userId);
    await expect(repo.delete(randomUUID())).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Subir Postgres efêmero (se não estiver rodando) e confirmar falha esperada**

```bash
docker run --rm -d --name avaliacao-repo-test -p 5433:5432 \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=avaliacao_test \
  postgres:17-alpine
sleep 2
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/avaliacao_test"
npx drizzle-kit migrate
INTEGRATION_POSTGRES=1 npx vitest run src/infrastructure/repositories/ConsultaRepositoryPostgres.integration.test.ts
```

Expected: FAIL — `Cannot find module './ConsultaRepositoryPostgres'`.

- [ ] **Step 3: Implementar `ConsultaRepositoryPostgres`**

Criar `src/infrastructure/repositories/ConsultaRepositoryPostgres.ts`:

```ts
import { eq, and, lt, isNotNull, desc, asc, type SQL } from "drizzle-orm";
import type { ConsultaRepository } from "@/src/application/ports";
import type { Consulta, FaseIndicadaLabel } from "@/src/domain";
import type { DbClient } from "@/src/infrastructure/db/client";
import { consultas, pacientes } from "@/src/infrastructure/db/schema";

/** Mapeamento legado: novas linhas gravam o código numérico da fase como texto. */
const FASE_TO_NUMBER: Record<FaseIndicadaLabel, number> = {
  Essência: 1,
  Núcleo: 2,
  Integral: 4,
};

/** Linhas antigas podem conter o código numérico OU o rótulo por extenso — aceitar ambos. */
const NUMBER_TO_FASE: Record<number, FaseIndicadaLabel> = {
  1: "Essência",
  2: "Núcleo",
  3: "Integral",
  4: "Integral",
};

function normalizeFaseFromRow(value: string | null): Consulta["fase_indicada"] {
  if (value == null) return undefined;
  const s = value.trim();
  const num = Number(s);
  if (Number.isInteger(num) && NUMBER_TO_FASE[num]) return NUMBER_TO_FASE[num];
  if (s === "Integral" || s === "Núcleo" || s === "Essência") return s as FaseIndicadaLabel;
  return undefined;
}

type ConsultaRow = typeof consultas.$inferSelect;

function rowToConsulta(row: ConsultaRow): Consulta {
  return {
    id: row.id,
    patient_id: row.patient_id,
    date: row.date,
    clinico: row.clinico ?? undefined,
    estrutura: row.estrutura ?? undefined,
    fase_indicada: normalizeFaseFromRow(row.fase_indicada),
    impressao_clinica: row.impressao_clinica ?? undefined,
    comparacao: row.comparacao ?? undefined,
  };
}

export class ConsultaRepositoryPostgres implements ConsultaRepository {
  constructor(
    private db: DbClient,
    private userId?: string
  ) {}

  private async assertOwnsPatient(patientId: string): Promise<void> {
    if (!this.userId) return;
    const [row] = await this.db
      .select({ id: pacientes.id })
      .from(pacientes)
      .where(and(eq(pacientes.id, patientId), eq(pacientes.user_id, this.userId)))
      .limit(1);
    if (!row) {
      throw new Error("ConsultaRepositoryPostgres.save: Acesso negado ao paciente.");
    }
  }

  async save(consulta: Consulta): Promise<void> {
    await this.assertOwnsPatient(consulta.patient_id);

    const faseValue = consulta.fase_indicada != null ? String(FASE_TO_NUMBER[consulta.fase_indicada]) : null;
    const values = {
      id: consulta.id,
      patient_id: consulta.patient_id,
      date: consulta.date,
      clinico: consulta.clinico ?? null,
      estrutura: consulta.estrutura ?? null,
      fase_indicada: faseValue,
      impressao_clinica: consulta.impressao_clinica ?? null,
      comparacao: consulta.comparacao ?? null,
    };

    await this.db
      .insert(consultas)
      .values(values)
      .onConflictDoUpdate({ target: consultas.id, set: values });
  }

  async findById(id: string): Promise<Consulta | null> {
    if (this.userId) {
      const rows = await this.db
        .select({ consulta: consultas })
        .from(consultas)
        .innerJoin(pacientes, eq(consultas.patient_id, pacientes.id))
        .where(and(eq(consultas.id, id), eq(pacientes.user_id, this.userId)))
        .limit(1);
      return rows[0] ? rowToConsulta(rows[0].consulta) : null;
    }
    const [row] = await this.db.select().from(consultas).where(eq(consultas.id, id)).limit(1);
    return row ? rowToConsulta(row) : null;
  }

  async findByPatientIdOrderByDate(patientId: string): Promise<Consulta[]> {
    if (this.userId) {
      const rows = await this.db
        .select({ consulta: consultas })
        .from(consultas)
        .innerJoin(pacientes, eq(consultas.patient_id, pacientes.id))
        .where(and(eq(consultas.patient_id, patientId), eq(pacientes.user_id, this.userId)))
        .orderBy(asc(consultas.date));
      return rows.map((r) => rowToConsulta(r.consulta));
    }
    const rows = await this.db
      .select()
      .from(consultas)
      .where(eq(consultas.patient_id, patientId))
      .orderBy(asc(consultas.date));
    return rows.map(rowToConsulta);
  }

  async getUltimaConsultaAntesDe(patientId: string, currentConsultaId: string): Promise<Consulta | null> {
    const atual = await this.findById(currentConsultaId);
    if (!atual) return null;

    const baseConditions: SQL[] = [
      eq(consultas.patient_id, patientId),
      lt(consultas.date, atual.date),
      isNotNull(consultas.clinico),
      isNotNull(consultas.estrutura),
    ];

    if (this.userId) {
      const rows = await this.db
        .select({ consulta: consultas })
        .from(consultas)
        .innerJoin(pacientes, eq(consultas.patient_id, pacientes.id))
        .where(and(...baseConditions, eq(pacientes.user_id, this.userId)))
        .orderBy(desc(consultas.date))
        .limit(1);
      return rows[0] ? rowToConsulta(rows[0].consulta) : null;
    }

    const [row] = await this.db
      .select()
      .from(consultas)
      .where(and(...baseConditions))
      .orderBy(desc(consultas.date))
      .limit(1);
    return row ? rowToConsulta(row) : null;
  }

  async delete(id: string): Promise<void> {
    if (this.userId) {
      const existing = await this.findById(id);
      if (!existing) return;
    }
    await this.db.delete(consultas).where(eq(consultas.id, id));
  }
}
```

- [ ] **Step 4: Rodar o teste novamente (esperado: passar)**

```bash
INTEGRATION_POSTGRES=1 npx vitest run src/infrastructure/repositories/ConsultaRepositoryPostgres.integration.test.ts
```

Expected: 4 testes passando.

- [ ] **Step 5: Encerrar o Postgres efêmero**

```bash
docker stop avaliacao-repo-test
unset DATABASE_URL
```

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/repositories/ConsultaRepositoryPostgres.ts src/infrastructure/repositories/ConsultaRepositoryPostgres.integration.test.ts
git commit -m "feat: implementa ConsultaRepositoryPostgres com testes de integração"
```

---

### Task 5: `UserRepositoryPostgres` + `AuthTokenRepositoryPostgres`

**Files:**
- Create: `src/infrastructure/repositories/UserRepositoryPostgres.ts`
- Create: `src/infrastructure/repositories/AuthTokenRepositoryPostgres.ts`
- Modify: `src/infrastructure/repositories/auth-repositories.integration.test.ts` (reescrever para Drizzle/Postgres, no lugar do Supabase)

**Interfaces:**
- Consumes: `DbClient` de `@/src/infrastructure/db/client`; tabelas `users`, `password_reset_tokens`, `account_unlock_tokens` de `@/src/infrastructure/db/schema`; `UserRepository`, `AuthTokenRepository`, `UserForAuth`, `PasswordResetTokenRecord`, `AccountUnlockTokenRecord` de `@/src/application/auth/ports`.
- Produces: `export class UserRepositoryPostgres implements UserRepository` e `export class AuthTokenRepositoryPostgres implements AuthTokenRepository`, ambos com construtor `(db: DbClient)`. Consumidos por `auth-container.ts` na Task 7.

- [ ] **Step 1: Reescrever o teste de integração para Postgres/Drizzle**

Substituir todo o conteúdo de `src/infrastructure/repositories/auth-repositories.integration.test.ts`:

```ts
/**
 * Testes de integração para UserRepositoryPostgres e AuthTokenRepositoryPostgres.
 * Rodam apenas quando INTEGRATION_POSTGRES=1 e DATABASE_URL apontam para um Postgres real
 * com as migrations do Drizzle aplicadas.
 *
 * Executar com: INTEGRATION_POSTGRES=1 DATABASE_URL=postgresql://postgres:postgres@localhost:5433/avaliacao_test npm run test -- auth-repositories.integration
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "@/src/infrastructure/db/schema";
import { UserRepositoryPostgres } from "./UserRepositoryPostgres";
import { AuthTokenRepositoryPostgres } from "./AuthTokenRepositoryPostgres";

const runIntegration = process.env.INTEGRATION_POSTGRES === "1" && !!process.env.DATABASE_URL;

function createDb() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  return { client, db: drizzle(client, { schema }) };
}

describe.skipIf(!runIntegration)("UserRepositoryPostgres (integration)", () => {
  let client: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let repo: UserRepositoryPostgres;
  const testEmail = `integration-${Date.now()}@test.local`;

  beforeAll(() => {
    ({ client, db } = createDb());
    repo = new UserRepositoryPostgres(db);
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.email, testEmail));
    await client.end();
  });

  it("insert e findByEmail retornam o usuário", async () => {
    await repo.insert({ email: testEmail, password_hash: "hash" });
    const user = await repo.findByEmail(testEmail);
    expect(user).not.toBeNull();
    expect(user!.email).toBe(testEmail);
    expect(user!.password_hash).toBe("hash");
    expect(user!.id).toBeDefined();
  });

  it("findById retorna o mesmo usuário", async () => {
    const byEmail = await repo.findByEmail(testEmail);
    expect(byEmail).not.toBeNull();
    const byId = await repo.findById(byEmail!.id);
    expect(byId).toEqual(byEmail);
  });

  it("updateFailedLogin e resetFailedLogin alteram estado", async () => {
    const user = await repo.findByEmail(testEmail);
    expect(user).not.toBeNull();
    const lockedUntil = new Date(Date.now() + 3600000).toISOString();
    await repo.updateFailedLogin(user!.id, 3, lockedUntil);
    const afterUpdate = await repo.findByEmail(testEmail);
    expect(afterUpdate!.failed_login_attempts).toBe(3);
    expect(afterUpdate!.locked_until).toBe(lockedUntil);
    await repo.resetFailedLogin(user!.id);
    const afterReset = await repo.findByEmail(testEmail);
    expect(afterReset!.failed_login_attempts).toBe(0);
    expect(afterReset!.locked_until).toBeNull();
  });
});

describe.skipIf(!runIntegration)("AuthTokenRepositoryPostgres (integration)", () => {
  let client: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let repo: AuthTokenRepositoryPostgres;
  let userId: string;

  beforeAll(async () => {
    ({ client, db } = createDb());
    repo = new AuthTokenRepositoryPostgres(db);
    const testEmail = `token-${Date.now()}@test.local`;
    const [user] = await db
      .insert(schema.users)
      .values({ email: testEmail, password_hash: null })
      .returning({ id: schema.users.id });
    userId = user.id;
  });

  afterAll(async () => {
    await db.delete(schema.password_reset_tokens).where(eq(schema.password_reset_tokens.user_id, userId));
    await db.delete(schema.account_unlock_tokens).where(eq(schema.account_unlock_tokens.user_id, userId));
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    await client.end();
  });

  it("createPasswordResetToken e findPasswordResetTokenById", async () => {
    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    const { id } = await repo.createPasswordResetToken(userId, "tokenHash", expiresAt);
    expect(id).toBeDefined();
    const row = await repo.findPasswordResetTokenById(id);
    expect(row).not.toBeNull();
    expect(row!.user_id).toBe(userId);
    expect(row!.expires_at).toBe(expiresAt);
    await repo.deletePasswordResetToken(id);
    const afterDelete = await repo.findPasswordResetTokenById(id);
    expect(afterDelete).toBeNull();
  });

  it("createAccountUnlockToken e findAccountUnlockTokenById", async () => {
    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    const { id } = await repo.createAccountUnlockToken(userId, "unlockHash", expiresAt);
    expect(id).toBeDefined();
    const row = await repo.findAccountUnlockTokenById(id);
    expect(row).not.toBeNull();
    expect(row!.user_id).toBe(userId);
    await repo.deleteAccountUnlockToken(id);
    const afterDelete = await repo.findAccountUnlockTokenById(id);
    expect(afterDelete).toBeNull();
  });
});
```

- [ ] **Step 2: Subir Postgres efêmero e confirmar falha esperada**

```bash
docker run --rm -d --name avaliacao-repo-test -p 5433:5432 \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=avaliacao_test \
  postgres:17-alpine
sleep 2
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/avaliacao_test"
npx drizzle-kit migrate
INTEGRATION_POSTGRES=1 npx vitest run src/infrastructure/repositories/auth-repositories.integration.test.ts
```

Expected: FAIL — `Cannot find module './UserRepositoryPostgres'`.

- [ ] **Step 3: Implementar `UserRepositoryPostgres`**

Criar `src/infrastructure/repositories/UserRepositoryPostgres.ts`:

```ts
import { eq } from "drizzle-orm";
import type { UserRepository, UserForAuth } from "@/src/application/auth/ports";
import type { DbClient } from "@/src/infrastructure/db/client";
import { users } from "@/src/infrastructure/db/schema";

function rowToUserForAuth(row: {
  id: string;
  email: string;
  password_hash: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
}): UserForAuth {
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    failed_login_attempts: row.failed_login_attempts ?? 0,
    locked_until: row.locked_until,
  };
}

const SELECT_COLUMNS = {
  id: users.id,
  email: users.email,
  password_hash: users.password_hash,
  failed_login_attempts: users.failed_login_attempts,
  locked_until: users.locked_until,
};

export class UserRepositoryPostgres implements UserRepository {
  constructor(private db: DbClient) {}

  async findByEmail(email: string): Promise<UserForAuth | null> {
    const [row] = await this.db
      .select(SELECT_COLUMNS)
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);
    return row ? rowToUserForAuth(row) : null;
  }

  async findById(id: string): Promise<UserForAuth | null> {
    const [row] = await this.db.select(SELECT_COLUMNS).from(users).where(eq(users.id, id)).limit(1);
    return row ? rowToUserForAuth(row) : null;
  }

  async insert(data: { email: string; password_hash: string | null; email_verified?: string | null }): Promise<void> {
    await this.db.insert(users).values({
      email: data.email.trim().toLowerCase(),
      password_hash: data.password_hash ?? null,
      email_verified: data.email_verified ?? null,
    });
  }

  async updateFailedLogin(userId: string, attempts: number, lockedUntil: string | null): Promise<void> {
    await this.db
      .update(users)
      .set({ failed_login_attempts: attempts, locked_until: lockedUntil, updated_at: new Date().toISOString() })
      .where(eq(users.id, userId));
  }

  async resetFailedLogin(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ failed_login_attempts: 0, locked_until: null, updated_at: new Date().toISOString() })
      .where(eq(users.id, userId));
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .where(eq(users.id, userId));
  }
}
```

- [ ] **Step 4: Implementar `AuthTokenRepositoryPostgres`**

Criar `src/infrastructure/repositories/AuthTokenRepositoryPostgres.ts`:

```ts
import { eq } from "drizzle-orm";
import type {
  AuthTokenRepository,
  PasswordResetTokenRecord,
  AccountUnlockTokenRecord,
} from "@/src/application/auth/ports";
import type { DbClient } from "@/src/infrastructure/db/client";
import { password_reset_tokens, account_unlock_tokens } from "@/src/infrastructure/db/schema";

export class AuthTokenRepositoryPostgres implements AuthTokenRepository {
  constructor(private db: DbClient) {}

  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: string): Promise<{ id: string }> {
    const [row] = await this.db
      .insert(password_reset_tokens)
      .values({ token_hash: tokenHash, user_id: userId, expires_at: expiresAt })
      .returning({ id: password_reset_tokens.id });
    if (!row?.id) throw new Error("AuthTokenRepositoryPostgres.createPasswordResetToken: no id returned");
    return { id: row.id };
  }

  async findPasswordResetTokenById(id: string): Promise<PasswordResetTokenRecord | null> {
    const [row] = await this.db
      .select({
        id: password_reset_tokens.id,
        token_hash: password_reset_tokens.token_hash,
        user_id: password_reset_tokens.user_id,
        expires_at: password_reset_tokens.expires_at,
      })
      .from(password_reset_tokens)
      .where(eq(password_reset_tokens.id, id))
      .limit(1);
    return row ?? null;
  }

  async deletePasswordResetToken(id: string): Promise<void> {
    await this.db.delete(password_reset_tokens).where(eq(password_reset_tokens.id, id));
  }

  async createAccountUnlockToken(userId: string, tokenHash: string, expiresAt: string): Promise<{ id: string }> {
    const [row] = await this.db
      .insert(account_unlock_tokens)
      .values({ token_hash: tokenHash, user_id: userId, expires_at: expiresAt })
      .returning({ id: account_unlock_tokens.id });
    if (!row?.id) throw new Error("AuthTokenRepositoryPostgres.createAccountUnlockToken: no id returned");
    return { id: row.id };
  }

  async findAccountUnlockTokenById(id: string): Promise<AccountUnlockTokenRecord | null> {
    const [row] = await this.db
      .select({
        id: account_unlock_tokens.id,
        token_hash: account_unlock_tokens.token_hash,
        user_id: account_unlock_tokens.user_id,
        expires_at: account_unlock_tokens.expires_at,
      })
      .from(account_unlock_tokens)
      .where(eq(account_unlock_tokens.id, id))
      .limit(1);
    return row ?? null;
  }

  async deleteAccountUnlockToken(id: string): Promise<void> {
    await this.db.delete(account_unlock_tokens).where(eq(account_unlock_tokens.id, id));
  }
}
```

- [ ] **Step 5: Rodar os testes novamente (esperado: passar)**

```bash
INTEGRATION_POSTGRES=1 npx vitest run src/infrastructure/repositories/auth-repositories.integration.test.ts
```

Expected: 5 testes passando.

- [ ] **Step 6: Encerrar o Postgres efêmero**

```bash
docker stop avaliacao-repo-test
unset DATABASE_URL
```

- [ ] **Step 7: Commit**

```bash
git add src/infrastructure/repositories/UserRepositoryPostgres.ts src/infrastructure/repositories/AuthTokenRepositoryPostgres.ts src/infrastructure/repositories/auth-repositories.integration.test.ts
git commit -m "feat: implementa UserRepositoryPostgres e AuthTokenRepositoryPostgres"
```

---

### Task 6: Reescrever `unlockPassword.ts`

**Files:**
- Modify: `src/infrastructure/unlockPassword.ts`
- Create: `src/infrastructure/unlockPassword.integration.test.ts`

**Interfaces:**
- Consumes: `DbClient` de `@/src/infrastructure/db/client`; tabela `profiles` de `@/src/infrastructure/db/schema`.
- Produces: mesmas assinaturas públicas de antes — `getUnlockPasswordHash(db: DbClient, userId: string)`, `setUnlockPassword(db: DbClient, userId: string, senhaPlain: string)`, `hashPassword`, `verifyUnlockPassword` (essas duas últimas não usam `db`, ficam inalteradas). Consumido por `app/actions.ts`, `app/avaliacao/[id]/desbloquear/page.tsx`, `app/configuracoes/page.tsx` (Task 7 atualiza as chamadas para passar `db` em vez de `supabaseClient`).

- [ ] **Step 1: Escrever o teste de integração (falhando)**

Criar `src/infrastructure/unlockPassword.integration.test.ts`:

```ts
/**
 * Testes de integração para getUnlockPasswordHash/setUnlockPassword.
 * Executar com: INTEGRATION_POSTGRES=1 DATABASE_URL=postgresql://postgres:postgres@localhost:5433/avaliacao_test npm run test -- unlockPassword.integration
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "@/src/infrastructure/db/schema";
import { getUnlockPasswordHash, setUnlockPassword, verifyUnlockPassword } from "./unlockPassword";

const runIntegration = process.env.INTEGRATION_POSTGRES === "1" && !!process.env.DATABASE_URL;

describe.skipIf(!runIntegration)("unlockPassword (integration)", () => {
  let client: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle<typeof schema>>;
  let userId: string;

  beforeAll(async () => {
    client = postgres(process.env.DATABASE_URL!, { max: 1 });
    db = drizzle(client, { schema });
    const [user] = await db
      .insert(schema.users)
      .values({ email: `unlock-${Date.now()}@test.local`, password_hash: null })
      .returning({ id: schema.users.id });
    userId = user.id;
  });

  afterAll(async () => {
    await db.delete(schema.profiles).where(eq(schema.profiles.user_id, userId));
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    await client.end();
  });

  it("retorna null quando ainda não há senha definida", async () => {
    const stored = await getUnlockPasswordHash(db, userId);
    expect(stored).toBeNull();
  });

  it("setUnlockPassword grava hash verificável por verifyUnlockPassword", async () => {
    await setUnlockPassword(db, userId, "minhaSenhaForte123");
    const stored = await getUnlockPasswordHash(db, userId);
    expect(stored).not.toBeNull();
    expect(verifyUnlockPassword("minhaSenhaForte123", stored!.hash, stored!.salt)).toBe(true);
    expect(verifyUnlockPassword("senhaErrada", stored!.hash, stored!.salt)).toBe(false);
  });

  it("setUnlockPassword é idempotente (upsert) ao ser chamado de novo", async () => {
    await setUnlockPassword(db, userId, "outraSenha456");
    const stored = await getUnlockPasswordHash(db, userId);
    expect(verifyUnlockPassword("outraSenha456", stored!.hash, stored!.salt)).toBe(true);
  });
});
```

- [ ] **Step 2: Subir Postgres efêmero e confirmar falha esperada**

```bash
docker run --rm -d --name avaliacao-repo-test -p 5433:5432 \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=avaliacao_test \
  postgres:17-alpine
sleep 2
export DATABASE_URL="postgresql://postgres:postgres@localhost:5433/avaliacao_test"
npx drizzle-kit migrate
INTEGRATION_POSTGRES=1 npx vitest run src/infrastructure/unlockPassword.integration.test.ts
```

Expected: FAIL — assinatura de `getUnlockPasswordHash`/`setUnlockPassword` ainda espera `SupabaseClient`, erro de tipo/execução ao passar `db`.

- [ ] **Step 3: Reescrever `unlockPassword.ts`**

Substituir todo o conteúdo de `src/infrastructure/unlockPassword.ts`:

```ts
/**
 * Senha de desbloqueio da avaliação (equipe de saúde).
 * Usada na tela "desbloquear" para permitir à equipe de saúde gerar o resultado após o paciente preencher.
 * Não confundir com desbloqueio de conta (auth), que usa account_unlock_tokens e auth-actions.
 */
import { scryptSync, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import type { DbClient } from "@/src/infrastructure/db/client";
import { profiles } from "@/src/infrastructure/db/schema";

const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384;
const SALT_BYTES = 16;

/** Hash e salt da senha de desbloqueio da equipe de saúde (tela de gerar resultado). */
export interface UnlockPasswordStored {
  hash: string;
  salt: string;
}

/** Obtém hash/salt da senha de desbloqueio da equipe de saúde (profiles) para o usuário. */
export async function getUnlockPasswordHash(db: DbClient, userId: string): Promise<UnlockPasswordStored | null> {
  const [row] = await db
    .select({
      unlock_password_hash: profiles.unlock_password_hash,
      unlock_password_salt: profiles.unlock_password_salt,
    })
    .from(profiles)
    .where(eq(profiles.user_id, userId))
    .limit(1);
  if (!row?.unlock_password_hash || !row?.unlock_password_salt) return null;
  return { hash: row.unlock_password_hash, salt: row.unlock_password_salt };
}

/** Define a senha de desbloqueio da equipe de saúde (Configurações). */
export async function setUnlockPassword(db: DbClient, userId: string, senhaPlain: string): Promise<void> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const storedHash = hashPassword(senhaPlain, salt);
  await db
    .insert(profiles)
    .values({ user_id: userId, unlock_password_hash: storedHash, unlock_password_salt: salt })
    .onConflictDoUpdate({
      target: profiles.user_id,
      set: { unlock_password_hash: storedHash, unlock_password_salt: salt },
    });
}

export function hashPassword(senhaPlain: string, saltHex: string): string {
  const salt = Buffer.from(saltHex, "hex");
  return scryptSync(senhaPlain, salt, SCRYPT_KEYLEN, { N: SCRYPT_N }).toString("hex");
}

/** Verifica a senha de desbloqueio da equipe de saúde (tela desbloquear → gerar). */
export function verifyUnlockPassword(senhaPlain: string, storedHash: string, storedSalt: string): boolean {
  const computed = hashPassword(senhaPlain, storedSalt);
  return computed.length === storedHash.length && computed === storedHash;
}
```

Nota: a checagem `isTableNotFoundError` do código antigo (workaround para migração aplicada fora de banda pelo dashboard do Supabase) foi removida — com Drizzle, a migração roda antes do deploy da aplicação (Task 2), então "tabela ausente" deixa de ser uma condição esperada em runtime.

- [ ] **Step 4: Rodar os testes novamente (esperado: passar)**

```bash
INTEGRATION_POSTGRES=1 npx vitest run src/infrastructure/unlockPassword.integration.test.ts
```

Expected: 3 testes passando.

- [ ] **Step 5: Encerrar o Postgres efêmero**

```bash
docker stop avaliacao-repo-test
unset DATABASE_URL
```

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/unlockPassword.ts src/infrastructure/unlockPassword.integration.test.ts
git commit -m "feat: reescreve unlockPassword.ts para Drizzle/Postgres"
```

---

### Task 7: Wiring completo — trocar Supabase por Postgres em toda a aplicação

**Files:**
- Modify: `src/infrastructure/container.ts`
- Modify: `src/infrastructure/auth-container.ts`
- Modify: `app/auth.ts`
- Modify: `app/use-cases.ts`
- Modify: `app/actions.ts`
- Modify: `app/avaliacao/[id]/desbloquear/page.tsx`
- Modify: `app/configuracoes/page.tsx`
- Modify: `app/api/avaliacao/[id]/pdf/route.ts`

**Interfaces:**
- Consumes: `DbClient`, `getDb` de `@/src/infrastructure/db/client`; `ConsultaRepositoryPostgres`, `PacienteRepositoryPostgres`, `UserRepositoryPostgres`, `AuthTokenRepositoryPostgres` das Tasks 3-5.
- Produces: `SessionContext.db: DbClient` (renomeado de `supabaseClient`) em `app/auth.ts`; `AuthenticatedUseCasesResult.db: DbClient` em `app/use-cases.ts`. Nenhum outro arquivo fora desta lista referencia `supabaseClient` ou `PERSISTENCE === "supabase"` depois desta task.

- [ ] **Step 1: Atualizar `src/infrastructure/container.ts`**

Ler o arquivo antes de editar. Trocar:
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AvaliacaoUseCases, ConsultaRepository, PacienteRepository } from "@/src/application/ports";
import type { Database } from "./supabase/database.types";
import {
  PAGINACAO_PACIENTES_DEFAULT_LIMIT,
  normalizarLimite,
  parseSearchFromQuery,
} from "@/src/config/paginacao-pacientes";
import { ConsultaRepositoryJson } from "./repositories/ConsultaRepositoryJson";
import { PacienteRepositoryJson } from "./repositories/PacienteRepositoryJson";
import { ConsultaRepositorySupabase } from "./repositories/ConsultaRepositorySupabase";
import { PacienteRepositorySupabase } from "./repositories/PacienteRepositorySupabase";
import { getSupabase } from "./supabase/server";
```
por:
```ts
import type { AvaliacaoUseCases, ConsultaRepository, PacienteRepository } from "@/src/application/ports";
import type { DbClient } from "./db/client";
import {
  PAGINACAO_PACIENTES_DEFAULT_LIMIT,
  normalizarLimite,
  parseSearchFromQuery,
} from "@/src/config/paginacao-pacientes";
import { ConsultaRepositoryJson } from "./repositories/ConsultaRepositoryJson";
import { PacienteRepositoryJson } from "./repositories/PacienteRepositoryJson";
import { ConsultaRepositoryPostgres } from "./repositories/ConsultaRepositoryPostgres";
import { PacienteRepositoryPostgres } from "./repositories/PacienteRepositoryPostgres";
import { getDb } from "./db/client";
```

Trocar:
```ts
const useSupabase = process.env.PERSISTENCE === "supabase";

let consultaRepoFallback: ConsultaRepository | null = null;
let pacienteRepoFallback: PacienteRepository | null = null;

/**
 * Isolamento entre usuários: repositórios Supabase recebem userId e filtram por user_id.
 * O client passado deve ser o mesmo retornado por getSession()/getSessionContext() (service role).
 */
function getConsultaRepository(
  supabase?: SupabaseClient<Database>,
  userId?: string
): ConsultaRepository {
  if (supabase) return new ConsultaRepositorySupabase(supabase, userId);
  if (!consultaRepoFallback) {
    consultaRepoFallback = useSupabase
      ? new ConsultaRepositorySupabase(getSupabase(), undefined)
      : new ConsultaRepositoryJson();
  }
  return consultaRepoFallback;
}

function getPacienteRepository(
  supabase?: SupabaseClient<Database>,
  userId?: string
): PacienteRepository {
  if (supabase) return new PacienteRepositorySupabase(supabase, userId);
  if (!pacienteRepoFallback) {
    pacienteRepoFallback = useSupabase
      ? new PacienteRepositorySupabase(getSupabase(), undefined)
      : new PacienteRepositoryJson();
  }
  return pacienteRepoFallback;
}

export function createAvaliacaoUseCases(
  supabase?: SupabaseClient<Database>,
  userId?: string
): AvaliacaoUseCases {
  const consultaRepo = getConsultaRepository(supabase, userId);
  const pacienteRepo = getPacienteRepository(supabase, userId);
```
por:
```ts
const usePostgres = process.env.PERSISTENCE === "postgres";

let consultaRepoFallback: ConsultaRepository | null = null;
let pacienteRepoFallback: PacienteRepository | null = null;

/**
 * Isolamento entre usuários: repositórios Postgres recebem userId e filtram por user_id.
 * O client passado deve ser o mesmo retornado por getSession()/getSessionContext().
 */
function getConsultaRepository(db?: DbClient, userId?: string): ConsultaRepository {
  if (db) return new ConsultaRepositoryPostgres(db, userId);
  if (!consultaRepoFallback) {
    consultaRepoFallback = usePostgres
      ? new ConsultaRepositoryPostgres(getDb(), undefined)
      : new ConsultaRepositoryJson();
  }
  return consultaRepoFallback;
}

function getPacienteRepository(db?: DbClient, userId?: string): PacienteRepository {
  if (db) return new PacienteRepositoryPostgres(db, userId);
  if (!pacienteRepoFallback) {
    pacienteRepoFallback = usePostgres
      ? new PacienteRepositoryPostgres(getDb(), undefined)
      : new PacienteRepositoryJson();
  }
  return pacienteRepoFallback;
}

export function createAvaliacaoUseCases(db?: DbClient, userId?: string): AvaliacaoUseCases {
  const consultaRepo = getConsultaRepository(db, userId);
  const pacienteRepo = getPacienteRepository(db, userId);
```

O restante do corpo de `createAvaliacaoUseCases` (a partir de `return { identificarPaciente: ...`) não muda.

- [ ] **Step 2: Atualizar `src/infrastructure/auth-container.ts`**

Trocar:
```ts
import "server-only";
import { getSupabase } from "@/src/infrastructure/supabase/server";
import { UserRepositorySupabase } from "@/src/infrastructure/repositories/UserRepositorySupabase";
import { AuthTokenRepositorySupabase } from "@/src/infrastructure/repositories/AuthTokenRepositorySupabase";
import { createAuthService } from "@/src/application/auth/AuthService";
import { authEmailSender } from "@/app/lib/email";
```
por:
```ts
import "server-only";
import { getDb } from "@/src/infrastructure/db/client";
import { UserRepositoryPostgres } from "@/src/infrastructure/repositories/UserRepositoryPostgres";
import { AuthTokenRepositoryPostgres } from "@/src/infrastructure/repositories/AuthTokenRepositoryPostgres";
import { createAuthService } from "@/src/application/auth/AuthService";
import { authEmailSender } from "@/app/lib/email";
```

Trocar dentro de `getAuthService()`:
```ts
  if (!authServiceInstance) {
    const supabase = getSupabase();
    const userRepo = new UserRepositorySupabase(supabase);
    const tokenRepo = new AuthTokenRepositorySupabase(supabase);
```
por:
```ts
  if (!authServiceInstance) {
    const db = getDb();
    const userRepo = new UserRepositoryPostgres(db);
    const tokenRepo = new AuthTokenRepositoryPostgres(db);
```

Também atualizar o comentário do docblock de `getAuthService` que menciona "repositórios Supabase" para "repositórios Postgres".

- [ ] **Step 3: Atualizar `app/auth.ts`**

Substituir todo o conteúdo:

```ts
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/app/auth-options";
import { getDb } from "@/src/infrastructure/db/client";
import type { DbClient } from "@/src/infrastructure/db/client";

export type AuthUser = {
  id: string;
  email?: string;
};

export type SessionContext = {
  session: Session;
  user: AuthUser;
  db: DbClient;
};

/**
 * Retorna o contexto de sessão autenticada com tipagem forte.
 * O isolamento entre usuários é feito via `userId` nos repositórios (ConsultaRepositoryPostgres, PacienteRepositoryPostgres).
 */
export async function getSessionContext(options?: {
  redirectIfUnauthenticated?: boolean;
}): Promise<SessionContext | null> {
  const session = await getServerSession(authOptions);
  const user: AuthUser | null = session?.user?.id
    ? {
        id: session.user.id,
        email: session.user.email ?? undefined,
      }
    : null;

  if (options?.redirectIfUnauthenticated && !user) {
    redirect("/login");
  }

  if (!session || !user) {
    return null;
  }

  const db = getDb();
  return { session, user, db };
}

export async function getSession(options?: {
  redirectIfUnauthenticated?: boolean;
}): Promise<{
  db: DbClient | null;
  user: AuthUser | null;
}> {
  const ctx = await getSessionContext(options);
  if (!ctx) {
    return { db: null, user: null };
  }
  return {
    db: ctx.db,
    user: ctx.user,
  };
}
```

- [ ] **Step 4: Atualizar `app/use-cases.ts`**

Substituir todo o conteúdo:

```ts
import type { AvaliacaoUseCases } from "@/src/application";
import type { DbClient } from "@/src/infrastructure/db/client";
import { createAvaliacaoUseCases } from "@/src/infrastructure/container";
import { getSessionContext } from "@/app/auth";
import type { AuthUser } from "@/app/auth";

/**
 * Retorna use cases com client Postgres do request (sessão + userId nos repositórios).
 * Chamar em páginas/actions após getSession(); passar db quando PERSISTENCE=postgres.
 */
export function getAvaliacaoUseCases(db?: DbClient, userId?: string): AvaliacaoUseCases {
  return createAvaliacaoUseCases(db, userId);
}

export type AuthenticatedUseCasesResult = {
  uc: AvaliacaoUseCases;
  user: AuthUser;
  db: DbClient;
};

/**
 * Obtém sessão autenticada e use cases em um único passo. Redireciona para /login se não autenticado.
 * Use em páginas e server actions que precisam de usuário + use cases.
 */
export async function getAuthenticatedUseCases(): Promise<AuthenticatedUseCasesResult> {
  const ctx = await getSessionContext({ redirectIfUnauthenticated: true });
  if (!ctx) {
    throw new Error("getAuthenticatedUseCases: sessão esperada após redirectIfUnauthenticated");
  }
  const uc = createAvaliacaoUseCases(ctx.db, ctx.user.id);
  return {
    uc,
    user: ctx.user,
    db: ctx.db,
  };
}
```

- [ ] **Step 5: Atualizar `app/actions.ts`**

Trocar (por volta da linha 217-227):
```ts
  const useSupabase = process.env.PERSISTENCE === "supabase";
  if (useSupabase) {
    const { uc, user, supabaseClient } = await getAuthenticatedUseCases();
    const consulta = await uc.obterConsulta(consultaId);
    if (!consulta) {
      redirect("/avaliacao/nova");
    }
    if (!consulta.estrutura) {
      redirect(pathAvaliacao(consultaId, "bloqueado"));
    }
    const stored = await getUnlockPasswordHash(supabaseClient, user.id);
```
por:
```ts
  const usePostgres = process.env.PERSISTENCE === "postgres";
  if (usePostgres) {
    const { uc, user, db } = await getAuthenticatedUseCases();
    const consulta = await uc.obterConsulta(consultaId);
    if (!consulta) {
      redirect("/avaliacao/nova");
    }
    if (!consulta.estrutura) {
      redirect(pathAvaliacao(consultaId, "bloqueado"));
    }
    const stored = await getUnlockPasswordHash(db, user.id);
```

E o comentário logo abaixo:
```ts
  // Fallback: modo JSON ou sem Supabase — senha global
```
por:
```ts
  // Fallback: modo JSON ou sem Postgres — senha global
```

Trocar (em `definirSenhaDesbloqueio`, por volta da linha 281-286):
```ts
  const { supabaseClient, user } = await getAuthenticatedUseCases();
  if (process.env.PERSISTENCE !== "supabase") {
    redirect("/configuracoes?error=" + encodeURIComponent("Configuração disponível apenas com Supabase."));
  }
  try {
    await setUnlockPassword(supabaseClient, user.id, senha);
```
por:
```ts
  const { db, user } = await getAuthenticatedUseCases();
  if (process.env.PERSISTENCE !== "postgres") {
    redirect("/configuracoes?error=" + encodeURIComponent("Configuração disponível apenas com Postgres."));
  }
  try {
    await setUnlockPassword(db, user.id, senha);
```

- [ ] **Step 6: Atualizar `app/avaliacao/[id]/desbloquear/page.tsx`**

Trocar:
```ts
  const [{ id: consultaId }, { error }, { uc, user, supabaseClient }] = await Promise.all([
```
por:
```ts
  const [{ id: consultaId }, { error }, { uc, user, db }] = await Promise.all([
```

Trocar:
```ts
  const useSupabase = process.env.PERSISTENCE === "supabase";
  let senhaDefinida = true;
  if (useSupabase) {
    const stored = await getUnlockPasswordHash(supabaseClient, user.id);
```
por:
```ts
  const usePostgres = process.env.PERSISTENCE === "postgres";
  let senhaDefinida = true;
  if (usePostgres) {
    const stored = await getUnlockPasswordHash(db, user.id);
```

- [ ] **Step 7: Atualizar `app/configuracoes/page.tsx`**

Trocar:
```ts
  const { user, supabaseClient } = await getAuthenticatedUseCases();

  let senhaDefinida = false;
  if (process.env.PERSISTENCE === "supabase") {
    const stored = await getUnlockPasswordHash(supabaseClient, user.id);
```
por:
```ts
  const { user, db } = await getAuthenticatedUseCases();

  let senhaDefinida = false;
  if (process.env.PERSISTENCE === "postgres") {
    const stored = await getUnlockPasswordHash(db, user.id);
```

- [ ] **Step 8: Atualizar `app/api/avaliacao/[id]/pdf/route.ts`**

Trocar:
```ts
  const uc = getAvaliacaoUseCases(ctx.supabaseClient, ctx.user.id);
```
por:
```ts
  const uc = getAvaliacaoUseCases(ctx.db, ctx.user.id);
```

- [ ] **Step 9: Verificar que não sobrou nenhuma referência antiga**

```bash
grep -rn "supabaseClient\|PERSISTENCE === \"supabase\"\|PERSISTENCE !== \"supabase\"" app src --include="*.ts" --include="*.tsx"
```

Expected: nenhuma saída (o único lugar que ainda deve conter a palavra "Supabase" nesta altura são os arquivos que serão apagados na Task 8 — `src/infrastructure/supabase/*.ts` e `*RepositorySupabase.ts`).

- [ ] **Step 10: Rodar a suíte de testes e o build**

```bash
npm test
npm run build
```

Expected: os 51 testes unitários + os testes de integração (pulados sem `INTEGRATION_POSTGRES=1`) passam; o build também passa — `container.ts`/`auth-container.ts` não importam mais os arquivos `*Supabase.ts`, mas eles continuam existindo sem uso nesta altura (só são apagados na Task 8), o que não quebra `tsc`/`next build` (arquivo órfão não referenciado não gera erro de compilação). Se o build falhar, investigar antes de prosseguir.

- [ ] **Step 11: Commit**

```bash
git add src/infrastructure/container.ts src/infrastructure/auth-container.ts app/auth.ts app/use-cases.ts app/actions.ts "app/avaliacao/[id]/desbloquear/page.tsx" app/configuracoes/page.tsx "app/api/avaliacao/[id]/pdf/route.ts"
git commit -m "refactor: substitui Supabase por Postgres em todo o wiring da aplicação"
```

---

### Task 8: Remover código morto do Supabase

**Files:**
- Delete: `src/infrastructure/supabase/server.ts`
- Delete: `src/infrastructure/supabase/client.ts`
- Delete: `src/infrastructure/supabase/createSupabaseClientForUser.ts`
- Delete: `src/infrastructure/supabase/database.types.ts`
- Delete: `src/infrastructure/repositories/ConsultaRepositorySupabase.ts`
- Delete: `src/infrastructure/repositories/PacienteRepositorySupabase.ts`
- Delete: `src/infrastructure/repositories/UserRepositorySupabase.ts`
- Delete: `src/infrastructure/repositories/AuthTokenRepositorySupabase.ts`
- Delete: `test-db.ts`
- Delete: `scripts/migrate-json-to-supabase.ts`
- Delete: `supabase/migrations/` (diretório inteiro; `drizzle/migrations/` já assume esse papel)
- Modify: `package.json` (remover `@supabase/supabase-js`, `@supabase/ssr`, e o script `migrate:json-to-supabase`)

**Interfaces:**
- Consumes: nada (limpeza pura — a Task 7 já garantiu que nada importa esses arquivos).
- Produces: nada novo.

- [ ] **Step 1: Confirmar que nada mais importa os arquivos a remover**

```bash
grep -rln "supabase/server\|supabase/client\"\|createSupabaseClientForUser\|supabase/database.types\|RepositorySupabase" app src --include="*.ts" --include="*.tsx" | grep -v "/supabase/\|Supabase.ts$"
```

Expected: nenhuma saída (se aparecer algo, a Task 7 ficou incompleta — corrigir antes de apagar).

- [ ] **Step 2: Apagar os arquivos**

```bash
git rm src/infrastructure/supabase/server.ts \
  src/infrastructure/supabase/client.ts \
  src/infrastructure/supabase/createSupabaseClientForUser.ts \
  src/infrastructure/supabase/database.types.ts \
  src/infrastructure/repositories/ConsultaRepositorySupabase.ts \
  src/infrastructure/repositories/PacienteRepositorySupabase.ts \
  src/infrastructure/repositories/UserRepositorySupabase.ts \
  src/infrastructure/repositories/AuthTokenRepositorySupabase.ts \
  test-db.ts \
  scripts/migrate-json-to-supabase.ts
git rm -r supabase/migrations
rmdir src/infrastructure/supabase supabase 2>/dev/null || true
```

- [ ] **Step 3: Remover dependências do Supabase do `package.json`**

Ler o arquivo, remover as linhas:
```
"@supabase/ssr": "^0.8.0",
"@supabase/supabase-js": "^2.98.0",
```
do bloco `dependencies`, e a linha:
```
"migrate:json-to-supabase": "tsx scripts/migrate-json-to-supabase.ts"
```
do bloco `scripts`.

```bash
npm install
```

(regenera o `package-lock.json` sem as entradas do Supabase.)

- [ ] **Step 4: Rodar testes e build**

```bash
npm test
npm run build
```

Expected: 51 testes unitários passam (mais os de integração, pulados). Build passa sem erros de TypeScript e sem menção a `@supabase/*`.

- [ ] **Step 5: Confirmar que nenhuma referência a `@supabase` restou**

```bash
grep -rn "@supabase" --include="*.ts" --include="*.tsx" --include="*.json" . | grep -v node_modules | grep -v package-lock.json
```

Expected: nenhuma saída.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove código e dependências do Supabase"
```

---

### Task 9: Runbook de migração de dados + atualização do CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** nenhuma (documentação e passo operacional manual, fora do ciclo de testes automatizados).

- [ ] **Step 1: Obter a connection string direta do Supabase**

No Dashboard do Supabase: Settings → Database → Connection string → modo "Session pooler" ou conexão direta (não a URL do PostgREST). Guardar como variável de ambiente local, sem commitar:

```bash
export SUPABASE_DIRECT_URL="postgresql://postgres.<ref>:<senha>@<host>:5432/postgres"
```

- [ ] **Step 2: Confirmar a versão do Postgres do Supabase**

```bash
psql "$SUPABASE_DIRECT_URL" -c "SELECT version();"
```

Se a versão major for diferente de 17, ajustar a tag da imagem `postgres:17-alpine` no `docker-compose.yml` (Task 2, Step 1) para a versão correspondente antes de prosseguir.

- [ ] **Step 3: Dump do banco atual (schema + dados, apenas as tabelas da aplicação)**

```bash
pg_dump "$SUPABASE_DIRECT_URL" \
  --no-owner --no-privileges --no-acl \
  -t public.pacientes -t public.consultas -t public.profiles \
  -t public.users -t public.password_reset_tokens -t public.account_unlock_tokens \
  --data-only \
  -f /tmp/avaliacao-dump.sql
```

Nota: `--data-only` porque o schema (tabelas, índices, FKs) já é criado pelas migrations do Drizzle (Task 1/2) — aplicar as migrations do Drizzle no Postgres novo ANTES de restaurar os dados, para não duplicar/conflitar definição de schema. Não incluímos as políticas de RLS no dump porque elas não existem no schema novo (removidas por design, conforme a spec).

- [ ] **Step 4: Copiar o dump para a VPS e aplicar migrations + restore, nessa ordem**

```bash
scp /tmp/avaliacao-dump.sql usuario@vps:/tmp/avaliacao-dump.sql
ssh usuario@vps
cd /caminho/do/projeto
docker compose up -d db
# aguardar healthcheck (docker compose ps db)
DATABASE_URL="postgresql://avaliacao:<senha>@localhost:5432/avaliacao" npx drizzle-kit migrate
docker compose exec -T db psql -U avaliacao -d avaliacao < /tmp/avaliacao-dump.sql
```

- [ ] **Step 5: Validar a contagem de linhas em cada tabela**

Rodar em ambos os bancos (Supabase antigo e Postgres novo) e comparar:

```bash
psql "$SUPABASE_DIRECT_URL" -c "SELECT 'pacientes', count(*) FROM pacientes UNION ALL SELECT 'consultas', count(*) FROM consultas UNION ALL SELECT 'users', count(*) FROM users;"
docker compose exec db psql -U avaliacao -d avaliacao -c "SELECT 'pacientes', count(*) FROM pacientes UNION ALL SELECT 'consultas', count(*) FROM consultas UNION ALL SELECT 'users', count(*) FROM users;"
```

Expected: mesmos números nos dois lados. Se divergirem, não prosseguir — investigar antes de apontar a aplicação para o banco novo.

- [ ] **Step 6: Remover o dump temporário**

```bash
rm /tmp/avaliacao-dump.sql
ssh usuario@vps "rm /tmp/avaliacao-dump.sql"
unset SUPABASE_DIRECT_URL
```

- [ ] **Step 7: Atualizar `CLAUDE.md`**

Na seção "Persistência dupla", trocar:
```
**Persistência dupla** — variável de ambiente `PERSISTENCE=supabase|json`. Em desenvolvimento sem Supabase, os repositórios JSON em `src/infrastructure/repositories/*Json.ts` servem de fallback. A troca é transparente graças às interfaces de `ports.ts`.
```
por:
```
**Persistência dupla** — variável de ambiente `PERSISTENCE=postgres|json`. Em desenvolvimento sem Postgres, os repositórios JSON em `src/infrastructure/repositories/*Json.ts` servem de fallback. A troca é transparente graças às interfaces de `ports.ts`.
```

Na tabela "Arquivos-Chave", trocar a linha:
```
| `src/infrastructure/container.ts` | Injeção de dependência — ponto central que conecta use cases com repositórios |
```
por (adicionar uma linha logo abaixo, mantendo a existente):
```
| `src/infrastructure/container.ts` | Injeção de dependência — ponto central que conecta use cases com repositórios |
| `src/infrastructure/db/schema.ts` / `db/client.ts` | Schema Drizzle e client Postgres (substituem `supabase/database.types.ts` e `supabase/server.ts`) |
```

Na seção "Ambiente", trocar:
```
- `PERSISTENCE` — `json` (dev) ou `supabase` (prod)
- `NEXTAUTH_SECRET` e `NEXTAUTH_URL`
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
```
por:
```
- `PERSISTENCE` — `json` (dev) ou `postgres` (prod)
- `NEXTAUTH_SECRET` e `NEXTAUTH_URL`
- `DATABASE_URL` — connection string do Postgres (self-hosted em container na VPS)
```

- [ ] **Step 8: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: atualiza CLAUDE.md para persistência Postgres self-hosted"
```

---

## Ordem de execução na VPS (resumo pós-implementação)

Depois que todas as tasks acima estiverem mescladas: `docker compose up -d db` → aguardar healthy → `drizzle-kit migrate` → Task 9 (dump/restore) → `docker compose up -d --build app caddy` (ou `./deploy.sh`). Isso já está coberto pelos steps da Task 9; esta seção é só um lembrete da ordem geral ao aplicar em produção.
