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
