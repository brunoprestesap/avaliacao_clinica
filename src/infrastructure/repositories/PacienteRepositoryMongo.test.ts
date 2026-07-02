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
