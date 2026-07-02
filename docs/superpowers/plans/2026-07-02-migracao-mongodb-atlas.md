# Migração Supabase Cloud → MongoDB Atlas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a camada de persistência do projeto (Supabase Cloud via PostgREST) por MongoDB Atlas (gerenciado) usando Mongoose, mantendo a aplicação na Vercel, sem alterar a camada de aplicação.

**Architecture:** Novo módulo `src/infrastructure/mongo/` (models Mongoose + conexão singleton cacheada) substitui `src/infrastructure/supabase/`. Cada repositório `*Supabase.ts` é reescrito como `*Mongo.ts` implementando a mesma interface de `ports.ts`/`auth/ports.ts`. Como o MongoDB não tem o conceito de "client por request" que o Supabase tinha, o wiring da aplicação fica mais simples: repositórios não recebem mais um client injetado, só o `userId` para escopo multi-tenant.

**Tech Stack:** mongoose ^9.7.3, mongodb-memory-server ^11.2.0 (dev, para testes), MongoDB Atlas (produção).

## Global Constraints

- Node 24, Next.js 16 App Router, TypeScript strict.
- Nenhuma mudança em `src/application/ports.ts` ou `src/application/auth/ports.ts`.
- `npm test` (vitest) deve passar ao final de cada task. Os testes de repositório usam `mongodb-memory-server` e **não precisam de gate por variável de ambiente nem de Docker** — rodam sempre, como parte normal da suíte.
- `npm run build` deve passar ao final da Task 6 e novamente ao final da Task 7.
- Nomes de campos nos documentos Mongo espelham exatamente os nomes de coluna atuais do Postgres (snake_case) — sem renomear nada.
- `fase_indicada` continua armazenado como string contendo o código numérico (`"1"`, `"2"`, `"4"`) ou o rótulo por extenso para documentos legados — mesmo comportamento de `ConsultaRepositorySupabase.ts`, preservado integralmente (ver Task 3).
- O índice único composto de `pacientes` (`user_id` + `identificador`) usa `partialFilterExpression: { user_id: { $type: "string" } }` para excluir documentos com `user_id` nulo/ausente — isso replica a semântica do Postgres, onde `NULL` nunca é considerado igual a outro `NULL` em uma constraint UNIQUE (o MongoDB, por padrão, trata múltiplos `null` como iguais e bloquearia o insert sem essa exclusão). Nota: `{ $exists: true, $ne: null }` (a forma mais intuitiva) **não é uma sintaxe válida** de partial index no MongoDB em nenhum ambiente — `$ne`/`$not` não são operadores suportados em `partialFilterExpression` (só `$eq`, `$exists: true`, `$gt/$gte/$lt/$lte`, `$type` e `$and` no topo). `$type: "string"` é a forma correta, já que `user_id` só assume `String` ou `null` neste schema.

---

### Task 1: Conexão Mongoose + models

**Files:**
- Create: `src/infrastructure/mongo/connection.ts`
- Create: `src/infrastructure/mongo/models.ts`
- Create: `src/infrastructure/mongo/models.test.ts`
- Modify: `package.json` (dependências)

**Interfaces:**
- Produces: `export async function getDb(): Promise<typeof mongoose>` em `connection.ts`; `PacienteModel`, `ConsultaModel`, `UserModel`, `ProfileModel`, `PasswordResetTokenModel`, `AccountUnlockTokenModel` (todos `mongoose.Model<T>`) e os tipos `PacienteDoc`, `ConsultaDoc`, `UserDoc`, `ProfileDoc`, `PasswordResetTokenDoc`, `AccountUnlockTokenDoc` em `models.ts`. Tasks 2-7 consomem esses exports.

- [ ] **Step 1: Instalar dependências**

```bash
npm install mongoose
npm install -D mongodb-memory-server
```

- [ ] **Step 2: Escrever o teste (falhando)**

Criar `src/infrastructure/mongo/models.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { PacienteModel, ConsultaModel } from "./models";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  await PacienteModel.deleteMany({});
  await ConsultaModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("models", () => {
  it("cria e lê um paciente pelo _id customizado", async () => {
    await PacienteModel.create({ _id: "p1", nome: "Ana", identificador: "PRONT-1", user_id: "u1" });
    const found = await PacienteModel.findById("p1").lean();
    expect(found?.nome).toBe("Ana");
  });

  it("bloqueia identificador duplicado para o mesmo user_id", async () => {
    await PacienteModel.create({ _id: "p1", nome: "Ana", identificador: "PRONT-1", user_id: "u1" });
    await expect(
      PacienteModel.create({ _id: "p2", nome: "Outra", identificador: "PRONT-1", user_id: "u1" })
    ).rejects.toThrow();
  });

  it("permite o mesmo identificador para user_id nulo em pacientes diferentes", async () => {
    await PacienteModel.create({ _id: "p1", nome: "Ana", identificador: "PRONT-1", user_id: null });
    await expect(
      PacienteModel.create({ _id: "p2", nome: "Outra", identificador: "PRONT-1", user_id: null })
    ).resolves.toBeDefined();
  });

  it("cria e lê uma consulta com clinico/estrutura em jsonb-like (Mixed)", async () => {
    await ConsultaModel.create({
      _id: "c1",
      patient_id: "p1",
      date: "2026-01-01",
      clinico: { itens: { C1: 1 }, score_total: 1, classificacao: "CLINICO_ESTAVEL", alerta_ideacao: false },
    });
    const found = await ConsultaModel.findById("c1").lean();
    expect(found?.clinico?.score_total).toBe(1);
  });
});
```

- [ ] **Step 3: Rodar o teste (esperado: falhar por módulo inexistente)**

```bash
npx vitest run src/infrastructure/mongo/models.test.ts
```

Expected: FAIL — `Cannot find module './models'`.

- [ ] **Step 4: Implementar `connection.ts`**

Criar `src/infrastructure/mongo/connection.ts`:

```ts
import "server-only";
import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _mongooseConnectPromise: Promise<typeof mongoose> | undefined;
}

/**
 * Único ponto de conexão com o MongoDB no servidor.
 * readyState === 1 (já conectado) retorna direto — cobre o caso de testes, que conectam
 * via mongoose.connect() diretamente no beforeAll, sem passar por aqui.
 * Fora de testes, cacheia a Promise de conexão em `global` para sobreviver a hot-reload
 * do Next.js em dev e reaproveitar a conexão entre invocações "quentes" na Vercel.
 */
export async function getDb(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  if (!global._mongooseConnectPromise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("Missing MONGODB_URI.");
    }
    global._mongooseConnectPromise = mongoose.connect(uri);
  }
  return global._mongooseConnectPromise;
}
```

- [ ] **Step 5: Implementar `models.ts`**

Criar `src/infrastructure/mongo/models.ts`:

```ts
import mongoose, { Schema, model, models } from "mongoose";
import type { ClinicoResultado, EstruturaResultado, ComparacaoResultado } from "@/src/domain";

export interface PacienteDoc {
  _id: string;
  nome: string;
  identificador: string;
  user_id: string | null;
}

const PacienteSchema = new Schema<PacienteDoc>(
  {
    _id: { type: String, required: true },
    nome: { type: String, required: true },
    identificador: { type: String, required: true },
    user_id: { type: String, default: null },
  },
  { versionKey: false, _id: false }
);
PacienteSchema.index(
  { user_id: 1, identificador: 1 },
  { unique: true, partialFilterExpression: { user_id: { $type: "string" } } }
);

export interface ConsultaDoc {
  _id: string;
  patient_id: string;
  date: string;
  clinico: ClinicoResultado | null;
  estrutura: EstruturaResultado | null;
  fase_indicada: string | null;
  impressao_clinica: string | null;
  comparacao: ComparacaoResultado | null;
}

const ConsultaSchema = new Schema<ConsultaDoc>(
  {
    _id: { type: String, required: true },
    patient_id: { type: String, required: true },
    date: { type: String, required: true },
    clinico: { type: Schema.Types.Mixed, default: null },
    estrutura: { type: Schema.Types.Mixed, default: null },
    fase_indicada: { type: String, default: null },
    impressao_clinica: { type: String, default: null },
    comparacao: { type: Schema.Types.Mixed, default: null },
  },
  { versionKey: false, _id: false }
);
ConsultaSchema.index({ patient_id: 1 });
ConsultaSchema.index({ patient_id: 1, date: 1 });

export interface UserDoc {
  _id: mongoose.Types.ObjectId;
  email: string;
  password_hash: string | null;
  email_verified: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  created_at: string;
  updated_at: string;
}

const UserSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, default: null },
    email_verified: { type: String, default: null },
    failed_login_attempts: { type: Number, default: 0 },
    locked_until: { type: String, default: null },
    created_at: { type: String, default: () => new Date().toISOString() },
    updated_at: { type: String, default: () => new Date().toISOString() },
  },
  { versionKey: false }
);

export interface ProfileDoc {
  user_id: string;
  unlock_password_hash: string;
  unlock_password_salt: string;
}

const ProfileSchema = new Schema<ProfileDoc>(
  {
    user_id: { type: String, required: true, unique: true },
    unlock_password_hash: { type: String, required: true },
    unlock_password_salt: { type: String, required: true },
  },
  { versionKey: false }
);

export interface PasswordResetTokenDoc {
  _id: mongoose.Types.ObjectId;
  token_hash: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

const PasswordResetTokenSchema = new Schema<PasswordResetTokenDoc>(
  {
    token_hash: { type: String, required: true },
    user_id: { type: String, required: true },
    expires_at: { type: String, required: true },
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  { versionKey: false }
);
PasswordResetTokenSchema.index({ user_id: 1 });
PasswordResetTokenSchema.index({ expires_at: 1 });

export interface AccountUnlockTokenDoc {
  _id: mongoose.Types.ObjectId;
  token_hash: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

const AccountUnlockTokenSchema = new Schema<AccountUnlockTokenDoc>(
  {
    token_hash: { type: String, required: true },
    user_id: { type: String, required: true },
    expires_at: { type: String, required: true },
    created_at: { type: String, default: () => new Date().toISOString() },
  },
  { versionKey: false }
);
AccountUnlockTokenSchema.index({ user_id: 1 });
AccountUnlockTokenSchema.index({ expires_at: 1 });

export const PacienteModel =
  (models.Paciente as mongoose.Model<PacienteDoc>) || model<PacienteDoc>("Paciente", PacienteSchema, "pacientes");
export const ConsultaModel =
  (models.Consulta as mongoose.Model<ConsultaDoc>) || model<ConsultaDoc>("Consulta", ConsultaSchema, "consultas");
export const UserModel = (models.User as mongoose.Model<UserDoc>) || model<UserDoc>("User", UserSchema, "users");
export const ProfileModel =
  (models.Profile as mongoose.Model<ProfileDoc>) || model<ProfileDoc>("Profile", ProfileSchema, "profiles");
export const PasswordResetTokenModel =
  (models.PasswordResetToken as mongoose.Model<PasswordResetTokenDoc>) ||
  model<PasswordResetTokenDoc>("PasswordResetToken", PasswordResetTokenSchema, "password_reset_tokens");
export const AccountUnlockTokenModel =
  (models.AccountUnlockToken as mongoose.Model<AccountUnlockTokenDoc>) ||
  model<AccountUnlockTokenDoc>("AccountUnlockToken", AccountUnlockTokenSchema, "account_unlock_tokens");
```

Nota: `{ _id: false }` na `Schema` de `Paciente`/`Consulta` desativa o `_id: ObjectId` automático do Mongoose, permitindo declarar nosso próprio campo `_id: String` (o mesmo `id` já gerado pela aplicação). O padrão `models.X || model(...)` evita o erro "Cannot overwrite model once compiled" no hot-reload do Next.js em dev.

- [ ] **Step 6: Rodar o teste novamente (esperado: passar)**

```bash
npx vitest run src/infrastructure/mongo/models.test.ts
```

Expected: 4 testes passando.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/infrastructure/mongo
git commit -m "feat: adiciona conexão e models Mongoose"
```

---

### Task 2: `PacienteRepositoryMongo`

**Files:**
- Create: `src/infrastructure/repositories/PacienteRepositoryMongo.ts`
- Create: `src/infrastructure/repositories/PacienteRepositoryMongo.test.ts`

**Interfaces:**
- Consumes: `getDb`, `PacienteModel` de `@/src/infrastructure/mongo/*`; `PacienteRepository` de `@/src/application/ports`; `Paciente` de `@/src/domain`.
- Produces: `export class PacienteRepositoryMongo implements PacienteRepository` com construtor `(userId?: string)` — **sem** parâmetro de client (diferente do antigo `PacienteRepositorySupabase`, que recebia o `SupabaseClient`; o MongoDB usa uma única conexão global, não um client por request). Consumido por `container.ts` na Task 6.

- [ ] **Step 1: Escrever o teste (falhando)**

Criar `src/infrastructure/repositories/PacienteRepositoryMongo.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { PacienteModel } from "@/src/infrastructure/mongo/models";
import { PacienteRepositoryMongo } from "./PacienteRepositoryMongo";

let mongod: MongoMemoryServer;
const userId = "user-1";

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  await PacienteModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("PacienteRepositoryMongo", () => {
  it("save + findById retornam o paciente", async () => {
    const repo = new PacienteRepositoryMongo(userId);
    const id = randomUUID();
    await repo.save({ id, nome: "Ana Silva", identificador: "PRONT-001" });
    const found = await repo.findById(id);
    expect(found).toEqual({ id, nome: "Ana Silva", identificador: "PRONT-001" });
  });

  it("findByIdentificador é case-insensitive", async () => {
    const repo = new PacienteRepositoryMongo(userId);
    const id = randomUUID();
    await repo.save({ id, nome: "Bruno Costa", identificador: "PRONT-002" });
    const found = await repo.findByIdentificador("pront-002");
    expect(found?.id).toBe(id);
  });

  it("listarPaginado filtra por query e retorna total", async () => {
    const repo = new PacienteRepositoryMongo(userId);
    await repo.save({ id: randomUUID(), nome: "Carla Dias", identificador: "PRONT-010" });
    await repo.save({ id: randomUUID(), nome: "Outra Pessoa", identificador: "PRONT-011" });
    const { pacientes, total } = await repo.listarPaginado(0, 10, "Carla");
    expect(total).toBe(1);
    expect(pacientes[0].nome).toBe("Carla Dias");
  });

  it("findById não retorna paciente de outro usuário", async () => {
    const repoOutro = new PacienteRepositoryMongo("outro-user");
    const id = randomUUID();
    await repoOutro.save({ id, nome: "Paciente Isolado", identificador: "PRONT-020" });

    const repo = new PacienteRepositoryMongo(userId);
    const found = await repo.findById(id);
    expect(found).toBeNull();
  });

  it("save com o mesmo id faz upsert (atualiza em vez de duplicar)", async () => {
    const repo = new PacienteRepositoryMongo(userId);
    const id = randomUUID();
    await repo.save({ id, nome: "Nome Original", identificador: "PRONT-030" });
    await repo.save({ id, nome: "Nome Atualizado", identificador: "PRONT-030" });
    const found = await repo.findById(id);
    expect(found?.nome).toBe("Nome Atualizado");
    const total = await PacienteModel.countDocuments({ _id: id });
    expect(total).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar o teste (esperado: falhar por módulo inexistente)**

```bash
npx vitest run src/infrastructure/repositories/PacienteRepositoryMongo.test.ts
```

Expected: FAIL — `Cannot find module './PacienteRepositoryMongo'`.

- [ ] **Step 3: Implementar `PacienteRepositoryMongo`**

Criar `src/infrastructure/repositories/PacienteRepositoryMongo.ts`:

```ts
import type { PacienteRepository } from "@/src/application/ports";
import type { Paciente } from "@/src/domain";
import { getDb } from "@/src/infrastructure/mongo/connection";
import { PacienteModel, type PacienteDoc } from "@/src/infrastructure/mongo/models";

/** Escapa metacaracteres de regex (diferente do escape de LIKE do Postgres). */
function escapeRegExp(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function docToPaciente(doc: Pick<PacienteDoc, "_id" | "nome" | "identificador">): Paciente {
  return { id: doc._id, nome: doc.nome, identificador: doc.identificador };
}

export class PacienteRepositoryMongo implements PacienteRepository {
  constructor(private userId?: string) {}

  async save(paciente: Paciente, ownerId?: string): Promise<void> {
    await getDb();
    const resolvedOwnerId = ownerId ?? this.userId ?? null;
    await PacienteModel.findByIdAndUpdate(
      paciente.id,
      { _id: paciente.id, nome: paciente.nome, identificador: paciente.identificador, user_id: resolvedOwnerId },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  async findById(id: string): Promise<Paciente | null> {
    await getDb();
    const filter: Record<string, unknown> = { _id: id };
    if (this.userId) filter.user_id = this.userId;
    const doc = await PacienteModel.findOne(filter).lean();
    return doc ? docToPaciente(doc) : null;
  }

  async findByIdentificador(identificador: string): Promise<Paciente | null> {
    await getDb();
    const normalized = identificador.trim().toLowerCase();
    const filter: Record<string, unknown> = {
      identificador: { $regex: `^${escapeRegExp(normalized)}$`, $options: "i" },
    };
    if (this.userId) filter.user_id = this.userId;
    const doc = await PacienteModel.findOne(filter).lean();
    if (!doc) return null;
    const p = docToPaciente(doc);
    if (p.identificador.toLowerCase() !== normalized) return null;
    return p;
  }

  async listarTodos(): Promise<Paciente[]> {
    await getDb();
    const filter: Record<string, unknown> = {};
    if (this.userId) filter.user_id = this.userId;
    const docs = await PacienteModel.find(filter).sort({ nome: 1 }).lean();
    return docs.map(docToPaciente);
  }

  async listarPaginado(
    offset: number,
    limit: number,
    query?: string
  ): Promise<{ pacientes: Paciente[]; total: number }> {
    await getDb();
    const filter: Record<string, unknown> = {};
    if (this.userId) filter.user_id = this.userId;
    if (query && query.trim() !== "") {
      const pattern = escapeRegExp(query.trim());
      filter.$or = [
        { nome: { $regex: pattern, $options: "i" } },
        { identificador: { $regex: pattern, $options: "i" } },
      ];
    }
    const [docs, total] = await Promise.all([
      PacienteModel.find(filter).sort({ nome: 1 }).skip(offset).limit(limit).lean(),
      PacienteModel.countDocuments(filter),
    ]);
    return { pacientes: docs.map(docToPaciente), total };
  }
}
```

- [ ] **Step 4: Rodar o teste novamente (esperado: passar)**

```bash
npx vitest run src/infrastructure/repositories/PacienteRepositoryMongo.test.ts
```

Expected: 5 testes passando.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/repositories/PacienteRepositoryMongo.ts src/infrastructure/repositories/PacienteRepositoryMongo.test.ts
git commit -m "feat: implementa PacienteRepositoryMongo com testes"
```

Não apagar `PacienteRepositorySupabase.ts` ainda — removido na Task 7, depois que `container.ts` parar de importá-lo (Task 6).

---

### Task 3: `ConsultaRepositoryMongo`

**Files:**
- Create: `src/infrastructure/repositories/ConsultaRepositoryMongo.ts`
- Create: `src/infrastructure/repositories/ConsultaRepositoryMongo.test.ts`

**Interfaces:**
- Consumes: `getDb`, `ConsultaModel`, `PacienteModel` de `@/src/infrastructure/mongo/*`; `ConsultaRepository` de `@/src/application/ports`; `Consulta`, `FaseIndicadaLabel` de `@/src/domain`.
- Produces: `export class ConsultaRepositoryMongo implements ConsultaRepository` com construtor `(userId?: string)`. Consumido por `container.ts` na Task 6.

- [ ] **Step 1: Escrever o teste (falhando)**

Criar `src/infrastructure/repositories/ConsultaRepositoryMongo.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { PacienteModel, ConsultaModel } from "@/src/infrastructure/mongo/models";
import { ConsultaRepositoryMongo } from "./ConsultaRepositoryMongo";
import { PacienteRepositoryMongo } from "./PacienteRepositoryMongo";

let mongod: MongoMemoryServer;
const userId = "user-1";
let patientId: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  await ConsultaModel.deleteMany({});
  await PacienteModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

async function criarPacienteDeTeste(): Promise<string> {
  const id = randomUUID();
  await new PacienteRepositoryMongo(userId).save({ id, nome: "Paciente Teste", identificador: `PRONT-${id.slice(0, 8)}` });
  return id;
}

describe("ConsultaRepositoryMongo", () => {
  it("save + findById fazem round-trip de clinico/estrutura/fase_indicada", async () => {
    patientId = await criarPacienteDeTeste();
    const repo = new ConsultaRepositoryMongo(userId);
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
    patientId = await criarPacienteDeTeste();
    const repoOutro = new ConsultaRepositoryMongo("outro-user");
    await expect(
      repoOutro.save({ id: randomUUID(), patient_id: patientId, date: "2026-01-11" })
    ).rejects.toThrow("Acesso negado ao paciente");
  });

  it("getUltimaConsultaAntesDe retorna apenas consultas anteriores completas", async () => {
    patientId = await criarPacienteDeTeste();
    const repo = new ConsultaRepositoryMongo(userId);
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
    const repo = new ConsultaRepositoryMongo(userId);
    await expect(repo.delete(randomUUID())).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Rodar o teste (esperado: falhar por módulo inexistente)**

```bash
npx vitest run src/infrastructure/repositories/ConsultaRepositoryMongo.test.ts
```

Expected: FAIL — `Cannot find module './ConsultaRepositoryMongo'`.

- [ ] **Step 3: Implementar `ConsultaRepositoryMongo`**

Criar `src/infrastructure/repositories/ConsultaRepositoryMongo.ts`:

```ts
import type { ConsultaRepository } from "@/src/application/ports";
import type { Consulta, FaseIndicadaLabel } from "@/src/domain";
import { getDb } from "@/src/infrastructure/mongo/connection";
import { ConsultaModel, PacienteModel, type ConsultaDoc } from "@/src/infrastructure/mongo/models";

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

function docToConsulta(doc: ConsultaDoc): Consulta {
  return {
    id: doc._id,
    patient_id: doc.patient_id,
    date: doc.date,
    clinico: doc.clinico ?? undefined,
    estrutura: doc.estrutura ?? undefined,
    fase_indicada: normalizeFaseFromRow(doc.fase_indicada),
    impressao_clinica: doc.impressao_clinica ?? undefined,
    comparacao: doc.comparacao ?? undefined,
  };
}

export class ConsultaRepositoryMongo implements ConsultaRepository {
  constructor(private userId?: string) {}

  private async assertOwnsPatient(patientId: string): Promise<void> {
    if (!this.userId) return;
    const owns = await PacienteModel.exists({ _id: patientId, user_id: this.userId });
    if (!owns) {
      throw new Error("ConsultaRepositoryMongo.save: Acesso negado ao paciente.");
    }
  }

  private async ownsOrUnrestricted(patientId: string): Promise<boolean> {
    if (!this.userId) return true;
    const owns = await PacienteModel.exists({ _id: patientId, user_id: this.userId });
    return !!owns;
  }

  async save(consulta: Consulta): Promise<void> {
    await getDb();
    await this.assertOwnsPatient(consulta.patient_id);
    const faseValue = consulta.fase_indicada != null ? String(FASE_TO_NUMBER[consulta.fase_indicada]) : null;
    await ConsultaModel.findByIdAndUpdate(
      consulta.id,
      {
        _id: consulta.id,
        patient_id: consulta.patient_id,
        date: consulta.date,
        clinico: consulta.clinico ?? null,
        estrutura: consulta.estrutura ?? null,
        fase_indicada: faseValue,
        impressao_clinica: consulta.impressao_clinica ?? null,
        comparacao: consulta.comparacao ?? null,
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  async findById(id: string): Promise<Consulta | null> {
    await getDb();
    const doc = await ConsultaModel.findById(id).lean();
    if (!doc) return null;
    if (!(await this.ownsOrUnrestricted(doc.patient_id))) return null;
    return docToConsulta(doc);
  }

  async findByPatientIdOrderByDate(patientId: string): Promise<Consulta[]> {
    await getDb();
    if (!(await this.ownsOrUnrestricted(patientId))) return [];
    const docs = await ConsultaModel.find({ patient_id: patientId }).sort({ date: 1 }).lean();
    return docs.map(docToConsulta);
  }

  async getUltimaConsultaAntesDe(patientId: string, currentConsultaId: string): Promise<Consulta | null> {
    await getDb();
    const atual = await this.findById(currentConsultaId);
    if (!atual) return null;
    if (!(await this.ownsOrUnrestricted(patientId))) return null;
    const doc = await ConsultaModel.findOne({
      patient_id: patientId,
      date: { $lt: atual.date },
      clinico: { $ne: null },
      estrutura: { $ne: null },
    })
      .sort({ date: -1 })
      .lean();
    return doc ? docToConsulta(doc) : null;
  }

  async delete(id: string): Promise<void> {
    await getDb();
    if (this.userId) {
      const existing = await this.findById(id);
      if (!existing) return;
    }
    await ConsultaModel.deleteOne({ _id: id });
  }
}
```

- [ ] **Step 4: Rodar o teste novamente (esperado: passar)**

```bash
npx vitest run src/infrastructure/repositories/ConsultaRepositoryMongo.test.ts
```

Expected: 4 testes passando.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/repositories/ConsultaRepositoryMongo.ts src/infrastructure/repositories/ConsultaRepositoryMongo.test.ts
git commit -m "feat: implementa ConsultaRepositoryMongo com testes"
```

---

### Task 4: `UserRepositoryMongo` + `AuthTokenRepositoryMongo`

**Files:**
- Create: `src/infrastructure/repositories/UserRepositoryMongo.ts`
- Create: `src/infrastructure/repositories/AuthTokenRepositoryMongo.ts`
- Modify: `src/infrastructure/repositories/auth-repositories.integration.test.ts` (reescrever para Mongo — mantém o nome do arquivo, muda o conteúdo)

**Interfaces:**
- Consumes: `getDb`, `UserModel`, `PasswordResetTokenModel`, `AccountUnlockTokenModel` de `@/src/infrastructure/mongo/*`; `UserRepository`, `AuthTokenRepository`, `UserForAuth`, `PasswordResetTokenRecord`, `AccountUnlockTokenRecord` de `@/src/application/auth/ports`.
- Produces: `export class UserRepositoryMongo implements UserRepository` e `export class AuthTokenRepositoryMongo implements AuthTokenRepository`, ambos **sem parâmetros no construtor** (o `UserRepositorySupabase`/`AuthTokenRepositorySupabase` originais também não tinham escopo por `userId`). Consumidos por `auth-container.ts` na Task 6.

- [ ] **Step 1: Reescrever o teste para Mongo**

Substituir todo o conteúdo de `src/infrastructure/repositories/auth-repositories.integration.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { UserModel, PasswordResetTokenModel, AccountUnlockTokenModel } from "@/src/infrastructure/mongo/models";
import { UserRepositoryMongo } from "./UserRepositoryMongo";
import { AuthTokenRepositoryMongo } from "./AuthTokenRepositoryMongo";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  await UserModel.deleteMany({});
  await PasswordResetTokenModel.deleteMany({});
  await AccountUnlockTokenModel.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("UserRepositoryMongo", () => {
  const repo = new UserRepositoryMongo();
  const testEmail = "integration@test.local";

  it("insert e findByEmail retornam o usuário", async () => {
    await repo.insert({ email: testEmail, password_hash: "hash" });
    const user = await repo.findByEmail(testEmail);
    expect(user).not.toBeNull();
    expect(user!.email).toBe(testEmail);
    expect(user!.password_hash).toBe("hash");
    expect(user!.id).toBeDefined();
  });

  it("findById retorna o mesmo usuário", async () => {
    await repo.insert({ email: testEmail, password_hash: "hash" });
    const byEmail = await repo.findByEmail(testEmail);
    expect(byEmail).not.toBeNull();
    const byId = await repo.findById(byEmail!.id);
    expect(byId).toEqual(byEmail);
  });

  it("findById retorna null para id malformado (não é um ObjectId válido)", async () => {
    const result = await repo.findById("id-invalido");
    expect(result).toBeNull();
  });

  it("updateFailedLogin e resetFailedLogin alteram estado", async () => {
    await repo.insert({ email: testEmail, password_hash: "hash" });
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

describe("AuthTokenRepositoryMongo", () => {
  const repo = new AuthTokenRepositoryMongo();
  let userId: string;

  beforeAll(async () => {
    const user = await UserModel.create({ email: "token@test.local", password_hash: null });
    userId = String(user._id);
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

  it("findPasswordResetTokenById retorna null para id malformado", async () => {
    const result = await repo.findPasswordResetTokenById("id-invalido");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar o teste (esperado: falhar por módulo inexistente)**

```bash
npx vitest run src/infrastructure/repositories/auth-repositories.integration.test.ts
```

Expected: FAIL — `Cannot find module './UserRepositoryMongo'`.

- [ ] **Step 3: Implementar `UserRepositoryMongo`**

Criar `src/infrastructure/repositories/UserRepositoryMongo.ts`:

```ts
import mongoose from "mongoose";
import type { UserRepository, UserForAuth } from "@/src/application/auth/ports";
import { getDb } from "@/src/infrastructure/mongo/connection";
import { UserModel, type UserDoc } from "@/src/infrastructure/mongo/models";

function docToUserForAuth(doc: Pick<UserDoc, "_id" | "email" | "password_hash" | "failed_login_attempts" | "locked_until">): UserForAuth {
  return {
    id: String(doc._id),
    email: doc.email,
    password_hash: doc.password_hash,
    failed_login_attempts: doc.failed_login_attempts ?? 0,
    locked_until: doc.locked_until,
  };
}

export class UserRepositoryMongo implements UserRepository {
  async findByEmail(email: string): Promise<UserForAuth | null> {
    await getDb();
    const doc = await UserModel.findOne({ email: email.trim().toLowerCase() }).lean();
    return doc ? docToUserForAuth(doc) : null;
  }

  async findById(id: string): Promise<UserForAuth | null> {
    await getDb();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await UserModel.findById(id).lean();
    return doc ? docToUserForAuth(doc) : null;
  }

  async insert(data: { email: string; password_hash: string | null; email_verified?: string | null }): Promise<void> {
    await getDb();
    await UserModel.create({
      email: data.email.trim().toLowerCase(),
      password_hash: data.password_hash ?? null,
      email_verified: data.email_verified ?? null,
    });
  }

  async updateFailedLogin(userId: string, attempts: number, lockedUntil: string | null): Promise<void> {
    await getDb();
    if (!mongoose.Types.ObjectId.isValid(userId)) return;
    await UserModel.updateOne(
      { _id: userId },
      { failed_login_attempts: attempts, locked_until: lockedUntil, updated_at: new Date().toISOString() }
    );
  }

  async resetFailedLogin(userId: string): Promise<void> {
    await getDb();
    if (!mongoose.Types.ObjectId.isValid(userId)) return;
    await UserModel.updateOne(
      { _id: userId },
      { failed_login_attempts: 0, locked_until: null, updated_at: new Date().toISOString() }
    );
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await getDb();
    if (!mongoose.Types.ObjectId.isValid(userId)) return;
    await UserModel.updateOne({ _id: userId }, { password_hash: passwordHash, updated_at: new Date().toISOString() });
  }
}
```

Nota: `mongoose.Types.ObjectId.isValid(id)` evita que um id malformado (que não é um ObjectId válido de 24 caracteres hex) derrube a query com `CastError` — o comportamento original do Supabase, para um id em formato errado, também retornava "não encontrado" em vez de lançar exceção.

- [ ] **Step 4: Implementar `AuthTokenRepositoryMongo`**

Criar `src/infrastructure/repositories/AuthTokenRepositoryMongo.ts`:

```ts
import mongoose from "mongoose";
import type {
  AuthTokenRepository,
  PasswordResetTokenRecord,
  AccountUnlockTokenRecord,
} from "@/src/application/auth/ports";
import { getDb } from "@/src/infrastructure/mongo/connection";
import { PasswordResetTokenModel, AccountUnlockTokenModel } from "@/src/infrastructure/mongo/models";

export class AuthTokenRepositoryMongo implements AuthTokenRepository {
  async createPasswordResetToken(userId: string, tokenHash: string, expiresAt: string): Promise<{ id: string }> {
    await getDb();
    const doc = await PasswordResetTokenModel.create({ token_hash: tokenHash, user_id: userId, expires_at: expiresAt });
    return { id: String(doc._id) };
  }

  async findPasswordResetTokenById(id: string): Promise<PasswordResetTokenRecord | null> {
    await getDb();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await PasswordResetTokenModel.findById(id).lean();
    if (!doc) return null;
    return { id: String(doc._id), token_hash: doc.token_hash, user_id: doc.user_id, expires_at: doc.expires_at };
  }

  async deletePasswordResetToken(id: string): Promise<void> {
    await getDb();
    if (!mongoose.Types.ObjectId.isValid(id)) return;
    await PasswordResetTokenModel.deleteOne({ _id: id });
  }

  async createAccountUnlockToken(userId: string, tokenHash: string, expiresAt: string): Promise<{ id: string }> {
    await getDb();
    const doc = await AccountUnlockTokenModel.create({ token_hash: tokenHash, user_id: userId, expires_at: expiresAt });
    return { id: String(doc._id) };
  }

  async findAccountUnlockTokenById(id: string): Promise<AccountUnlockTokenRecord | null> {
    await getDb();
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const doc = await AccountUnlockTokenModel.findById(id).lean();
    if (!doc) return null;
    return { id: String(doc._id), token_hash: doc.token_hash, user_id: doc.user_id, expires_at: doc.expires_at };
  }

  async deleteAccountUnlockToken(id: string): Promise<void> {
    await getDb();
    if (!mongoose.Types.ObjectId.isValid(id)) return;
    await AccountUnlockTokenModel.deleteOne({ _id: id });
  }
}
```

- [ ] **Step 5: Rodar os testes novamente (esperado: passar)**

```bash
npx vitest run src/infrastructure/repositories/auth-repositories.integration.test.ts
```

Expected: 7 testes passando.

- [ ] **Step 6: Commit**

```bash
git add src/infrastructure/repositories/UserRepositoryMongo.ts src/infrastructure/repositories/AuthTokenRepositoryMongo.ts src/infrastructure/repositories/auth-repositories.integration.test.ts
git commit -m "feat: implementa UserRepositoryMongo e AuthTokenRepositoryMongo"
```

---

### Task 5: Reescrever `unlockPassword.ts`

**Files:**
- Modify: `src/infrastructure/unlockPassword.ts`
- Create: `src/infrastructure/unlockPassword.test.ts`

**Interfaces:**
- Consumes: `getDb`, `ProfileModel` de `@/src/infrastructure/mongo/*`.
- Produces: `getUnlockPasswordHash(userId: string)`, `setUnlockPassword(userId: string, senhaPlain: string)` — **sem parâmetro de client** (diferente da versão Supabase, que recebia `SupabaseClient` como primeiro argumento). `hashPassword`/`verifyUnlockPassword` inalterados. Consumido por `app/actions.ts`, `app/avaliacao/[id]/desbloquear/page.tsx`, `app/configuracoes/page.tsx` na Task 6.

- [ ] **Step 1: Escrever o teste (falhando)**

Criar `src/infrastructure/unlockPassword.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { getUnlockPasswordHash, setUnlockPassword, verifyUnlockPassword } from "./unlockPassword";

let mongod: MongoMemoryServer;
const userId = "user-unlock-1";

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("unlockPassword", () => {
  it("retorna null quando ainda não há senha definida", async () => {
    const stored = await getUnlockPasswordHash(userId);
    expect(stored).toBeNull();
  });

  it("setUnlockPassword grava hash verificável por verifyUnlockPassword", async () => {
    await setUnlockPassword(userId, "minhaSenhaForte123");
    const stored = await getUnlockPasswordHash(userId);
    expect(stored).not.toBeNull();
    expect(verifyUnlockPassword("minhaSenhaForte123", stored!.hash, stored!.salt)).toBe(true);
    expect(verifyUnlockPassword("senhaErrada", stored!.hash, stored!.salt)).toBe(false);
  });

  it("setUnlockPassword é idempotente (upsert) ao ser chamado de novo", async () => {
    await setUnlockPassword(userId, "outraSenha456");
    const stored = await getUnlockPasswordHash(userId);
    expect(verifyUnlockPassword("outraSenha456", stored!.hash, stored!.salt)).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar o teste (esperado: falhar por assinatura incompatível)**

```bash
npx vitest run src/infrastructure/unlockPassword.test.ts
```

Expected: FAIL — `getUnlockPasswordHash`/`setUnlockPassword` ainda esperam `SupabaseClient` como primeiro argumento.

- [ ] **Step 3: Reescrever `unlockPassword.ts`**

Substituir todo o conteúdo de `src/infrastructure/unlockPassword.ts`:

```ts
/**
 * Senha de desbloqueio da avaliação (equipe de saúde).
 * Usada na tela "desbloquear" para permitir à equipe de saúde gerar o resultado após o paciente preencher.
 * Não confundir com desbloqueio de conta (auth), que usa account_unlock_tokens e auth-actions.
 */
import { scryptSync, randomBytes } from "node:crypto";
import { getDb } from "@/src/infrastructure/mongo/connection";
import { ProfileModel } from "@/src/infrastructure/mongo/models";

const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384;
const SALT_BYTES = 16;

/** Hash e salt da senha de desbloqueio da equipe de saúde (tela de gerar resultado). */
export interface UnlockPasswordStored {
  hash: string;
  salt: string;
}

/** Obtém hash/salt da senha de desbloqueio da equipe de saúde (profiles) para o usuário. */
export async function getUnlockPasswordHash(userId: string): Promise<UnlockPasswordStored | null> {
  await getDb();
  const doc = await ProfileModel.findOne({ user_id: userId }).lean();
  if (!doc?.unlock_password_hash || !doc?.unlock_password_salt) return null;
  return { hash: doc.unlock_password_hash, salt: doc.unlock_password_salt };
}

/** Define a senha de desbloqueio da equipe de saúde (Configurações). */
export async function setUnlockPassword(userId: string, senhaPlain: string): Promise<void> {
  await getDb();
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const storedHash = hashPassword(senhaPlain, salt);
  await ProfileModel.findOneAndUpdate(
    { user_id: userId },
    { unlock_password_hash: storedHash, unlock_password_salt: salt },
    { upsert: true, setDefaultsOnInsert: true }
  );
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

- [ ] **Step 4: Rodar o teste novamente (esperado: passar)**

```bash
npx vitest run src/infrastructure/unlockPassword.test.ts
```

Expected: 3 testes passando.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/unlockPassword.ts src/infrastructure/unlockPassword.test.ts
git commit -m "feat: reescreve unlockPassword.ts para Mongoose/MongoDB"
```

---

### Task 6: Wiring completo — trocar Supabase por Mongo em toda a aplicação

**Files:**
- Modify: `src/infrastructure/container.ts`
- Modify: `src/infrastructure/auth-container.ts`
- Modify: `app/auth.ts`
- Modify: `app/use-cases.ts`
- Modify: `app/actions.ts`
- Modify: `app/avaliacao/[id]/desbloquear/page.tsx`
- Modify: `app/configuracoes/page.tsx`
- Modify: `app/api/avaliacao/[id]/pdf/route.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `ConsultaRepositoryMongo`, `PacienteRepositoryMongo` (Tasks 2-3), `UserRepositoryMongo`, `AuthTokenRepositoryMongo` (Task 4), `getUnlockPasswordHash`/`setUnlockPassword` com nova assinatura (Task 5).
- Produces: `SessionContext` e `AuthenticatedUseCasesResult` sem o campo `supabaseClient`/`db` — o MongoDB não precisa de um client por request, então o campo é **removido**, não renomeado (diferente da migração para Postgres, onde ele viraria `db`). `createAvaliacaoUseCases(userId?: string)` — assinatura simplificada, sem parâmetro de client.

Nota importante sobre uma simplificação intencional: no código atual, `getConsultaRepository`/`getPacienteRepository` têm um branch "sem client explícito" que cai num singleton cacheado, construído com `userId: undefined` (sem escopo de tenant) quando `PERSISTENCE=supabase`. Levantamos que esse branch nunca é exercitado hoje — todo call site real passa client e userId juntos. Como o MongoDB não tem o conceito de "client passado ou não" (é sempre a mesma conexão global), esse branch não tem um equivalente direto; a nova versão sempre constrói um `ConsultaRepositoryMongo(userId)`/`PacienteRepositoryMongo(userId)` fresco respeitando o `userId` recebido (inclusive `undefined`), o que é estritamente mais seguro que o comportamento antigo (que, se algum dia fosse exercitado, retornaria um singleton sem filtro de tenant, cacheado indefinidamente). O singleton cacheado continua existindo só para o fallback JSON (`PERSISTENCE` diferente de `mongo`), que nunca teve escopo de usuário mesmo.

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
import {
  PAGINACAO_PACIENTES_DEFAULT_LIMIT,
  normalizarLimite,
  parseSearchFromQuery,
} from "@/src/config/paginacao-pacientes";
import { ConsultaRepositoryJson } from "./repositories/ConsultaRepositoryJson";
import { PacienteRepositoryJson } from "./repositories/PacienteRepositoryJson";
import { ConsultaRepositoryMongo } from "./repositories/ConsultaRepositoryMongo";
import { PacienteRepositoryMongo } from "./repositories/PacienteRepositoryMongo";
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
const useMongo = process.env.PERSISTENCE === "mongo";

let consultaRepoFallback: ConsultaRepository | null = null;
let pacienteRepoFallback: PacienteRepository | null = null;

/** Isolamento entre usuários: repositórios Mongo recebem userId e filtram por user_id. */
function getConsultaRepository(userId?: string): ConsultaRepository {
  if (useMongo) return new ConsultaRepositoryMongo(userId);
  if (!consultaRepoFallback) consultaRepoFallback = new ConsultaRepositoryJson();
  return consultaRepoFallback;
}

function getPacienteRepository(userId?: string): PacienteRepository {
  if (useMongo) return new PacienteRepositoryMongo(userId);
  if (!pacienteRepoFallback) pacienteRepoFallback = new PacienteRepositoryJson();
  return pacienteRepoFallback;
}

export function createAvaliacaoUseCases(userId?: string): AvaliacaoUseCases {
  const consultaRepo = getConsultaRepository(userId);
  const pacienteRepo = getPacienteRepository(userId);
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
import { UserRepositoryMongo } from "@/src/infrastructure/repositories/UserRepositoryMongo";
import { AuthTokenRepositoryMongo } from "@/src/infrastructure/repositories/AuthTokenRepositoryMongo";
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
    const userRepo = new UserRepositoryMongo();
    const tokenRepo = new AuthTokenRepositoryMongo();
```

Também atualizar o comentário do docblock de `getAuthService` que menciona "repositórios Supabase" para "repositórios Mongo".

- [ ] **Step 3: Atualizar `app/auth.ts`**

Substituir todo o conteúdo:

```ts
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/app/auth-options";

export type AuthUser = {
  id: string;
  email?: string;
};

export type SessionContext = {
  session: Session;
  user: AuthUser;
};

/**
 * Retorna o contexto de sessão autenticada com tipagem forte.
 * O isolamento entre usuários é feito via `userId` nos repositórios (ConsultaRepositoryMongo, PacienteRepositoryMongo).
 * Não há um "client de banco" por request no MongoDB — a conexão é global (src/infrastructure/mongo/connection.ts).
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

  return { session, user };
}

export async function getSession(options?: {
  redirectIfUnauthenticated?: boolean;
}): Promise<{
  user: AuthUser | null;
}> {
  const ctx = await getSessionContext(options);
  if (!ctx) {
    return { user: null };
  }
  return { user: ctx.user };
}
```

- [ ] **Step 4: Atualizar `app/use-cases.ts`**

Substituir todo o conteúdo:

```ts
import type { AvaliacaoUseCases } from "@/src/application";
import { createAvaliacaoUseCases } from "@/src/infrastructure/container";
import { getSessionContext } from "@/app/auth";
import type { AuthUser } from "@/app/auth";

/**
 * Retorna use cases com userId do request (escopo de tenant nos repositórios).
 * Chamar em páginas/actions após getSession(); passar userId quando PERSISTENCE=mongo.
 */
export function getAvaliacaoUseCases(userId?: string): AvaliacaoUseCases {
  return createAvaliacaoUseCases(userId);
}

export type AuthenticatedUseCasesResult = {
  uc: AvaliacaoUseCases;
  user: AuthUser;
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
  const uc = createAvaliacaoUseCases(ctx.user.id);
  return { uc, user: ctx.user };
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
  const useMongo = process.env.PERSISTENCE === "mongo";
  if (useMongo) {
    const { uc, user } = await getAuthenticatedUseCases();
    const consulta = await uc.obterConsulta(consultaId);
    if (!consulta) {
      redirect("/avaliacao/nova");
    }
    if (!consulta.estrutura) {
      redirect(pathAvaliacao(consultaId, "bloqueado"));
    }
    const stored = await getUnlockPasswordHash(user.id);
```

E o comentário logo abaixo:
```ts
  // Fallback: modo JSON ou sem Supabase — senha global
```
por:
```ts
  // Fallback: modo JSON ou sem Mongo — senha global
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
  const { user } = await getAuthenticatedUseCases();
  if (process.env.PERSISTENCE !== "mongo") {
    redirect("/configuracoes?error=" + encodeURIComponent("Configuração disponível apenas com MongoDB."));
  }
  try {
    await setUnlockPassword(user.id, senha);
```

- [ ] **Step 6: Atualizar `app/avaliacao/[id]/desbloquear/page.tsx`**

Trocar:
```ts
  const [{ id: consultaId }, { error }, { uc, user, supabaseClient }] = await Promise.all([
```
por:
```ts
  const [{ id: consultaId }, { error }, { uc, user }] = await Promise.all([
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
  const useMongo = process.env.PERSISTENCE === "mongo";
  let senhaDefinida = true;
  if (useMongo) {
    const stored = await getUnlockPasswordHash(user.id);
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
  const { user } = await getAuthenticatedUseCases();

  let senhaDefinida = false;
  if (process.env.PERSISTENCE === "mongo") {
    const stored = await getUnlockPasswordHash(user.id);
```

- [ ] **Step 8: Atualizar `app/api/avaliacao/[id]/pdf/route.ts`**

Trocar:
```ts
  const uc = getAvaliacaoUseCases(ctx.supabaseClient, ctx.user.id);
```
por:
```ts
  const uc = getAvaliacaoUseCases(ctx.user.id);
```

- [ ] **Step 9: Atualizar `.env.example`**

Substituir o bloco de variáveis do Supabase:
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
por:
```
# MongoDB (obrigatório quando PERSISTENCE=mongo e para auth)
# MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/avaliacao?retryWrites=true&w=majority
```

E a primeira linha do arquivo:
```
# Persistência: "json" (padrão, usa data/*.json) ou "supabase"
# Em produção (VPS/Docker), defina PERSISTENCE=supabase explicitamente —
# sem isso o container grava dados em data/*.json dentro da própria imagem.
# PERSISTENCE=json
```
por:
```
# Persistência: "json" (padrão, usa data/*.json) ou "mongo"
# Em produção, defina PERSISTENCE=mongo explicitamente —
# sem isso a aplicação usa data/*.json (não persiste em serverless/Vercel).
# PERSISTENCE=json
```

- [ ] **Step 10: Verificar que não sobrou nenhuma referência antiga**

```bash
grep -rn "supabaseClient\|PERSISTENCE === \"supabase\"\|PERSISTENCE !== \"supabase\"" app src --include="*.ts" --include="*.tsx"
```

Expected: nenhuma saída (o único lugar que ainda deve conter a palavra "Supabase" nesta altura são os arquivos que serão apagados na Task 7 — `src/infrastructure/supabase/*.ts` e `*RepositorySupabase.ts`).

- [ ] **Step 11: Rodar a suíte de testes e o build**

```bash
npm test
npm run build
```

Expected: todos os testes passam (unitários + os novos de Mongo, que rodam sempre via `mongodb-memory-server`); o build também passa — `container.ts`/`auth-container.ts` não importam mais os arquivos `*Supabase.ts`, mas eles continuam existindo sem uso nesta altura (só são apagados na Task 7), o que não quebra `tsc`/`next build`.

- [ ] **Step 12: Commit**

```bash
git add src/infrastructure/container.ts src/infrastructure/auth-container.ts app/auth.ts app/use-cases.ts app/actions.ts "app/avaliacao/[id]/desbloquear/page.tsx" app/configuracoes/page.tsx "app/api/avaliacao/[id]/pdf/route.ts" .env.example
git commit -m "refactor: substitui Supabase por MongoDB em todo o wiring da aplicação"
```

---

### Task 6b: Corrigir tratamento de erro de configuração em `app/auth-actions.ts`

**Contexto:** encontrado no review da Task 6 — não fazia parte do escopo original das 8 tasks (lacuna do plano). `app/auth-actions.ts` tinha um `getAuthServiceOrRedirect()` que envolvia só a chamada síncrona `getAuthService()` num try/catch, checando mensagens como `"SUPABASE"`/`"Missing NEXT_PUBLIC_SUPABASE"` para redirecionar com uma mensagem amigável em caso de configuração ausente. Isso funcionava porque `getSupabase()` (antigo) lançava exceção **de forma síncrona** dentro de `getAuthService()`. Com Mongo, `getAuthService()` só constrói `new UserRepositoryMongo()`/`new AuthTokenRepositoryMongo()` (sem efeito colateral) — o erro de `MONGODB_URI` ausente só é lançado depois, dentro de `getDb()`, chamado de forma assíncrona dentro de cada método do reposit��rio. Ou seja, o `try/catch` atual nunca mais pega esse erro — ele escaparia como exceção não tratada.

**Files:**
- Modify: `app/auth-actions.ts`

**Interfaces:** nenhuma nova — comportamento externo (redirects, mensagens) preservado, só a causa raiz do bug corrigida.

- [ ] **Step 1: Reescrever o wrapper de tratamento de erro**

Trocar:
```ts
const AUTH_CONFIG_ERROR =
  "Autenticação não configurada. Configure as variáveis do Supabase no .env.local.";
const BCRYPT_ROUNDS = 10;

function getAuthServiceOrRedirect(buildErrorRedirect: (message: string) => string) {
  try {
    return getAuthService();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (
      !msg ||
      msg.includes("Missing NEXT_PUBLIC_SUPABASE") ||
      msg.includes("SUPABASE")
    ) {
      redirect(buildErrorRedirect(AUTH_CONFIG_ERROR));
    }
    throw e;
  }
}
```
por:
```ts
import { isRedirectError } from "next/dist/client/components/redirect-error";

const AUTH_CONFIG_ERROR = "Autenticação não configurada. Configure MONGODB_URI no .env.local.";
const BCRYPT_ROUNDS = 10;

/**
 * Envolve a obtenção do AuthService + a chamada assíncrona que o usa.
 * Com Mongo, o erro de configuração ausente (MONGODB_URI) só é lançado dentro
 * de getDb(), chamado de forma assíncrona nos métodos do repositório — não mais
 * de forma síncrona em getAuthService() como acontecia com o Supabase. Por isso
 * o catch precisa envolver a chamada assíncrona também, não só a construção do serviço.
 */
async function withAuthConfigErrorHandling<T>(
  buildErrorRedirect: (message: string) => string,
  fn: (authService: ReturnType<typeof getAuthService>) => Promise<T>
): Promise<T> {
  try {
    const authService = getAuthService();
    return await fn(authService);
  } catch (e) {
    if (isRedirectError(e)) throw e;
    const msg = e instanceof Error ? e.message : "";
    if (!msg || msg.includes("Missing MONGODB_URI")) {
      redirect(buildErrorRedirect(AUTH_CONFIG_ERROR));
    }
    throw e;
  }
}
```

Nota: `next/dist/client/components/redirect-error` é o caminho interno usado em versões recentes do Next.js para `isRedirectError` — **antes de escrever este import, verificar no `package.json`/`node_modules/next` se `isRedirectError` está exportado publicamente em `next/navigation` nesta versão do Next (16.1.6)**; se estiver, preferir `import { isRedirectError } from "next/navigation";` em vez do caminho interno. Buscar por `isRedirectError` em `app/actions.ts` (usado lá em `definirSenhaDesbloqueio`) para copiar exatamente o import já usado no projeto.

- [ ] **Step 2: Atualizar as quatro server actions para usar o novo wrapper**

Em `signupAction`, trocar:
```ts
  const authService = getAuthServiceOrRedirect(
    (msg) => "/auth/cadastro?error=" + encodeURIComponent(msg)
  );
  const passwordHash = await hash(password, BCRYPT_ROUNDS);
  const result = await authService.registerUser({ email, passwordHash });
```
por:
```ts
  const passwordHash = await hash(password, BCRYPT_ROUNDS);
  const result = await withAuthConfigErrorHandling(
    (msg) => "/auth/cadastro?error=" + encodeURIComponent(msg),
    (authService) => authService.registerUser({ email, passwordHash })
  );
```

Em `requestResetAction`, trocar:
```ts
  const authService = getAuthServiceOrRedirect(
    (msg) => "/auth/recuperar-senha?error=" + encodeURIComponent(msg)
  );
  await authService.requestPasswordReset({ email });
```
por:
```ts
  await withAuthConfigErrorHandling(
    (msg) => "/auth/recuperar-senha?error=" + encodeURIComponent(msg),
    (authService) => authService.requestPasswordReset({ email })
  );
```

Em `resetPasswordAction`, trocar:
```ts
  const authService = getAuthServiceOrRedirect(
    (msg) => errorQuery(msg)
  );
  const passwordHash = await hash(password, BCRYPT_ROUNDS);
  const result = await authService.resetPassword({
    tokenId: id,
    rawToken: token,
    passwordHash,
  });
```
por:
```ts
  const passwordHash = await hash(password, BCRYPT_ROUNDS);
  const result = await withAuthConfigErrorHandling(
    (msg) => errorQuery(msg),
    (authService) =>
      authService.resetPassword({ tokenId: id, rawToken: token, passwordHash })
  );
```

Em `unlockAccountAction`, trocar:
```ts
  const authService = getAuthServiceOrRedirect(
    (msg) => errorQuery(msg)
  );
  const result = await authService.unlockAccount({ tokenId: id, rawToken: token });
```
por:
```ts
  const result = await withAuthConfigErrorHandling(
    (msg) => errorQuery(msg),
    (authService) => authService.unlockAccount({ tokenId: id, rawToken: token })
  );
```

- [ ] **Step 3: Rodar build e testes**

```bash
npm test
npm run build
```

Expected: ambos passam sem erros de tipo (o `ReturnType<typeof getAuthService>` deve inferir corretamente o tipo do serviço retornado).

- [ ] **Step 4: Commit**

```bash
git add app/auth-actions.ts
git commit -m "fix: corrige tratamento de erro de configuração para MongoDB em auth-actions.ts"
```

---

### Task 7: Remover código morto do Supabase

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
- Delete: `supabase/migrations/` (diretório inteiro)
- Modify: `package.json` (remover `@supabase/supabase-js`, `@supabase/ssr`)

**Interfaces:**
- Consumes: nada (limpeza pura — a Task 6 já garantiu que nada importa esses arquivos).
- Produces: nada novo.

**Pré-requisito:** a Task 8 (migração dos dados de produção) deve ter sido executada antes desta task, já que o script de migração depende de `@supabase/supabase-js` ainda estar instalado. Se as tasks forem executadas em sequência em um ambiente de desenvolvimento (sem apontar para o Supabase de produção real), pode-se prosseguir normalmente — só a migração de dados real (produção) precisa respeitar essa ordem.

- [ ] **Step 1: Confirmar que nada mais importa os arquivos a remover**

```bash
grep -rln "supabase/server\|supabase/client\"\|createSupabaseClientForUser\|supabase/database.types\|RepositorySupabase" app src --include="*.ts" --include="*.tsx" | grep -v "/supabase/\|Supabase.ts$"
```

Expected: nenhuma saída (se aparecer algo, a Task 6 ficou incompleta — corrigir antes de apagar).

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
  test-db.ts
git rm -r supabase/migrations
rmdir src/infrastructure/supabase supabase 2>/dev/null || true
```

- [ ] **Step 3: Remover dependências do Supabase do `package.json`**

Ler o arquivo, remover as linhas:
```
"@supabase/ssr": "^0.8.0",
"@supabase/supabase-js": "^2.98.0",
```
do bloco `dependencies`.

```bash
npm install
```

- [ ] **Step 4: Rodar testes e build**

```bash
npm test
npm run build
```

Expected: todos os testes passam. Build passa sem erros de TypeScript e sem menção a `@supabase/*`.

- [ ] **Step 5: Confirmar que nenhuma referência a `@supabase` restou**

```bash
grep -rn "@supabase" --include="*.ts" --include="*.tsx" --include="*.json" . | grep -v node_modules | grep -v package-lock.json | grep -v scripts/migrate-supabase-to-mongo.ts
```

Expected: nenhuma saída (o script de migração da Task 8, se ainda não tiver sido removido manualmente após o corte de produção, é a única exceção esperada — ele é intencionalmente descartável após uso único, não faz parte do código de produção).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove código e dependências do Supabase"
```

---

### Task 8: Script de migração de dados + variáveis na Vercel + atualização do CLAUDE.md

**Files:**
- Create: `scripts/migrate-supabase-to-mongo.ts`
- Modify: `package.json` (novo script `migrate:supabase-to-mongo`)
- Modify: `CLAUDE.md`

**Interfaces:** nenhuma — script one-off e documentação, fora do ciclo de testes automatizados.

**Nota de ordem:** esta task deve ser executada **antes** da Task 7 em um cenário de migração real de produção (o script depende de `@supabase/supabase-js`, removido na Task 7). Em desenvolvimento/implementação do plano, pode ficar depois na ordem do plano — só a execução real do script contra dados de produção precisa respeitar a dependência.

- [ ] **Step 1: Escrever o script de migração**

Criar `scripts/migrate-supabase-to-mongo.ts`:

```ts
/**
 * Script one-off: migra os dados do Supabase Cloud para o MongoDB Atlas.
 * Requer as credenciais do Supabase (para leitura) e MONGODB_URI (para escrita) no ambiente.
 * Executar: npx tsx scripts/migrate-supabase-to-mongo.ts
 * (ou: npx dotenv -e .env.production.local -- npx tsx scripts/migrate-supabase-to-mongo.ts)
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import mongoose from "mongoose";
import {
  PacienteModel,
  ConsultaModel,
  UserModel,
  ProfileModel,
  PasswordResetTokenModel,
  AccountUnlockTokenModel,
} from "../src/infrastructure/mongo/models";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mongoUri = process.env.MONGODB_URI;

if (!supabaseUrl || !supabaseKey) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (origem).");
  process.exit(1);
}
if (!mongoUri) {
  console.error("Defina MONGODB_URI (destino).");
  process.exit(1);
}

async function main() {
  const supabase = createClient(supabaseUrl as string, supabaseKey as string, { auth: { persistSession: false } });
  await mongoose.connect(mongoUri as string);

  const { data: users, error: usersError } = await supabase.from("users").select("*");
  if (usersError) throw new Error(`Erro ao ler users: ${usersError.message}`);
  const userIdMap = new Map<string, string>();
  for (const u of users ?? []) {
    const doc = await UserModel.create({
      email: u.email,
      password_hash: u.password_hash,
      email_verified: u.email_verified,
      failed_login_attempts: u.failed_login_attempts ?? 0,
      locked_until: u.locked_until,
      created_at: u.created_at,
      updated_at: u.updated_at,
    });
    userIdMap.set(u.id, String(doc._id));
  }
  console.log(`users: ${userIdMap.size} migrados`);

  const { data: profiles, error: profilesError } = await supabase.from("profiles").select("*");
  if (profilesError) throw new Error(`Erro ao ler profiles: ${profilesError.message}`);
  let profilesCount = 0;
  for (const p of profiles ?? []) {
    const newUserId = userIdMap.get(p.user_id);
    if (!newUserId) continue;
    await ProfileModel.create({
      user_id: newUserId,
      unlock_password_hash: p.unlock_password_hash,
      unlock_password_salt: p.unlock_password_salt,
    });
    profilesCount++;
  }
  console.log(`profiles: ${profilesCount} migrados`);

  const { data: pacientes, error: pacientesError } = await supabase.from("pacientes").select("*");
  if (pacientesError) throw new Error(`Erro ao ler pacientes: ${pacientesError.message}`);
  for (const p of pacientes ?? []) {
    await PacienteModel.create({
      _id: p.id,
      nome: p.nome,
      identificador: p.identificador,
      user_id: p.user_id ? (userIdMap.get(p.user_id) ?? null) : null,
    });
  }
  console.log(`pacientes: ${(pacientes ?? []).length} migrados`);

  const { data: consultas, error: consultasError } = await supabase.from("consultas").select("*");
  if (consultasError) throw new Error(`Erro ao ler consultas: ${consultasError.message}`);
  for (const c of consultas ?? []) {
    await ConsultaModel.create({
      _id: c.id,
      patient_id: c.patient_id,
      date: c.date,
      clinico: c.clinico ?? null,
      estrutura: c.estrutura ?? null,
      fase_indicada: c.fase_indicada != null ? String(c.fase_indicada) : null,
      impressao_clinica: c.impressao_clinica ?? null,
      comparacao: c.comparacao ?? null,
    });
  }
  console.log(`consultas: ${(consultas ?? []).length} migrados`);

  const { data: prTokens, error: prTokensError } = await supabase.from("password_reset_tokens").select("*");
  if (prTokensError) throw new Error(`Erro ao ler password_reset_tokens: ${prTokensError.message}`);
  let prCount = 0;
  for (const t of prTokens ?? []) {
    const newUserId = userIdMap.get(t.user_id);
    if (!newUserId) continue;
    await PasswordResetTokenModel.create({
      token_hash: t.token_hash,
      user_id: newUserId,
      expires_at: t.expires_at,
      created_at: t.created_at,
    });
    prCount++;
  }
  console.log(`password_reset_tokens: ${prCount} migrados`);

  const { data: auTokens, error: auTokensError } = await supabase.from("account_unlock_tokens").select("*");
  if (auTokensError) throw new Error(`Erro ao ler account_unlock_tokens: ${auTokensError.message}`);
  let auCount = 0;
  for (const t of auTokens ?? []) {
    const newUserId = userIdMap.get(t.user_id);
    if (!newUserId) continue;
    await AccountUnlockTokenModel.create({
      token_hash: t.token_hash,
      user_id: newUserId,
      expires_at: t.expires_at,
      created_at: t.created_at,
    });
    auCount++;
  }
  console.log(`account_unlock_tokens: ${auCount} migrados`);

  await mongoose.disconnect();
  console.log("Migração concluída.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

Nota: o script precisa migrar `users` primeiro e guardar o mapeamento de id antigo (uuid do Postgres) → novo (`ObjectId` do Mongo) em `userIdMap`, porque `pacientes.user_id`, `profiles.user_id` e os tokens referenciam o id do usuário — como o MongoDB gera um novo `ObjectId` para cada `User` criado, os ids mudam e as referências precisam ser traduzidas durante a cópia.

- [ ] **Step 2: Adicionar o script ao `package.json`**

Adicionar ao bloco `scripts`:
```
"migrate:supabase-to-mongo": "tsx scripts/migrate-supabase-to-mongo.ts"
```

- [ ] **Step 3: Rodar o script contra o Supabase de produção e o MongoDB Atlas novo**

Com as credenciais de produção do Supabase e a `MONGODB_URI` do cluster Atlas novo definidas no ambiente (não commitadas):

```bash
npm run migrate:supabase-to-mongo
```

Expected: saída no console com a contagem de documentos migrados por collection, sem erros.

- [ ] **Step 4: Validar a contagem de documentos**

```bash
psql "$SUPABASE_DIRECT_URL" -c "SELECT 'pacientes', count(*) FROM pacientes UNION ALL SELECT 'consultas', count(*) FROM consultas UNION ALL SELECT 'users', count(*) FROM users;"
```

Comparar com a contagem correspondente no Atlas (via `mongosh` ou MongoDB Compass): `db.pacientes.countDocuments()`, `db.consultas.countDocuments()`, `db.users.countDocuments()`. Os números devem bater. Se divergirem, não prosseguir com o corte — investigar antes.

- [ ] **Step 5: Trocar as variáveis de ambiente na Vercel e fazer o corte**

No dashboard da Vercel (Settings → Environment Variables do projeto `avaliacao-clinica`): adicionar `MONGODB_URI` (produção), mudar `PERSISTENCE` de `supabase` para `mongo`, remover as variáveis `NEXT_PUBLIC_SUPABASE_*`/`SUPABASE_*`. Fazer um novo deploy (redeploy) para a mudança de env vars ter efeito.

- [ ] **Step 6: Atualizar `CLAUDE.md`**

Na seção "Persistência dupla", trocar:
```
**Persistência dupla** — variável de ambiente `PERSISTENCE=supabase|json`. Em desenvolvimento sem Supabase, os repositórios JSON em `src/infrastructure/repositories/*Json.ts` servem de fallback. A troca é transparente graças às interfaces de `ports.ts`.
```
por:
```
**Persistência dupla** — variável de ambiente `PERSISTENCE=mongo|json`. Em desenvolvimento sem MongoDB, os repositórios JSON em `src/infrastructure/repositories/*Json.ts` servem de fallback. A troca é transparente graças às interfaces de `ports.ts`.
```

Na tabela "Arquivos-Chave", adicionar uma linha logo abaixo da linha de `container.ts`:
```
| `src/infrastructure/mongo/models.ts` / `mongo/connection.ts` | Schemas e conexão Mongoose (substituem `supabase/database.types.ts` e `supabase/server.ts`) |
```

Na seção "Ambiente", trocar:
```
- `PERSISTENCE` — `json` (dev) ou `supabase` (prod)
- `NEXTAUTH_SECRET` e `NEXTAUTH_URL`
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
```
por:
```
- `PERSISTENCE` — `json` (dev) ou `mongo` (prod)
- `NEXTAUTH_SECRET` e `NEXTAUTH_URL`
- `MONGODB_URI` — connection string do MongoDB Atlas
```

- [ ] **Step 7: Commit**

```bash
git add scripts/migrate-supabase-to-mongo.ts package.json CLAUDE.md
git commit -m "feat: script de migração Supabase → MongoDB e atualização do CLAUDE.md"
```
