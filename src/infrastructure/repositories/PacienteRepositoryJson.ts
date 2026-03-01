import type { PacienteRepository } from "@/src/application/ports";
import type { Paciente } from "@/src/domain";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), "data");
const PACIENTES_FILE = join(DATA_DIR, "pacientes.json");

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readPacientes(): Promise<Paciente[]> {
  await ensureDataDir();
  try {
    const raw = await readFile(PACIENTES_FILE, "utf-8");
    const data = JSON.parse(raw) as Paciente[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function writePacientes(pacientes: Paciente[]): Promise<void> {
  await ensureDataDir();
  await writeFile(PACIENTES_FILE, JSON.stringify(pacientes, null, 2), "utf-8");
}

export class PacienteRepositoryJson implements PacienteRepository {
  async save(paciente: Paciente, _ownerId?: string): Promise<void> {
    const list = await readPacientes();
    const idx = list.findIndex((p) => p.id === paciente.id);
    if (idx >= 0) {
      list[idx] = paciente;
    } else {
      list.push(paciente);
    }
    await writePacientes(list);
  }

  async findById(id: string): Promise<Paciente | null> {
    const list = await readPacientes();
    return list.find((p) => p.id === id) ?? null;
  }

  async findByIdentificador(identificador: string): Promise<Paciente | null> {
    const list = await readPacientes();
    const normalized = identificador.trim().toLowerCase();
    return list.find((p) => p.identificador.toLowerCase() === normalized) ?? null;
  }

  async listarTodos(): Promise<Paciente[]> {
    const list = await readPacientes();
    return list.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  async listarPaginado(
    offset: number,
    limit: number,
    query?: string
  ): Promise<{ pacientes: Paciente[]; total: number }> {
    const list = await readPacientes();
    let sorted = [...list].sort((a, b) => a.nome.localeCompare(b.nome));
    if (query && query.trim() !== "") {
      const q = query.trim().toLowerCase();
      sorted = sorted.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) || p.identificador.toLowerCase().includes(q)
      );
    }
    const total = sorted.length;
    const pacientes = sorted.slice(offset, offset + limit);
    return { pacientes, total };
  }
}
