import type { ConsultaRepository } from "@/src/application/ports";
import type { Consulta } from "@/src/domain";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), "data");
const CONSULTAS_FILE = join(DATA_DIR, "consultas.json");

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readConsultas(): Promise<Consulta[]> {
  await ensureDataDir();
  try {
    const raw = await readFile(CONSULTAS_FILE, "utf-8");
    const data = JSON.parse(raw) as Consulta[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writeConsultas(consultas: Consulta[]): Promise<void> {
  await ensureDataDir();
  await writeFile(CONSULTAS_FILE, JSON.stringify(consultas, null, 2), "utf-8");
}

export class ConsultaRepositoryJson implements ConsultaRepository {
  async save(consulta: Consulta): Promise<void> {
    const list = await readConsultas();
    const idx = list.findIndex((c) => c.id === consulta.id);
    if (idx >= 0) {
      list[idx] = consulta;
    } else {
      list.push(consulta);
    }
    await writeConsultas(list);
  }

  async findById(id: string): Promise<Consulta | null> {
    const list = await readConsultas();
    return list.find((c) => c.id === id) ?? null;
  }

  async findByPatientIdOrderByDate(patientId: string): Promise<Consulta[]> {
    const list = await readConsultas();
    return list
      .filter((c) => c.patient_id === patientId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getUltimaConsultaAntesDe(patientId: string, date: string): Promise<Consulta | null> {
    const list = await this.findByPatientIdOrderByDate(patientId);
    const anteriores = list.filter((c) => c.date < date);
    return anteriores.length > 0 ? anteriores[anteriores.length - 1]! : null;
  }
}
