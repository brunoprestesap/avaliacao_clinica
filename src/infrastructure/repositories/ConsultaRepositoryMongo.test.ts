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
