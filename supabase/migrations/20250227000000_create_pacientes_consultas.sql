-- Tabela pacientes (domínio Paciente)
CREATE TABLE IF NOT EXISTS pacientes (
  id text PRIMARY KEY,
  nome text NOT NULL,
  identificador text NOT NULL UNIQUE
);

-- Tabela consultas (domínio Consulta)
CREATE TABLE IF NOT EXISTS consultas (
  id text PRIMARY KEY,
  patient_id text NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  date text NOT NULL,
  clinico jsonb,
  estrutura jsonb,
  fase_indicada smallint CHECK (fase_indicada >= 1 AND fase_indicada <= 4),
  impressao_clinica text,
  comparacao jsonb
);

-- Índices para consultas por paciente e data
CREATE INDEX IF NOT EXISTS idx_consultas_patient_id ON consultas(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultas_patient_id_date ON consultas(patient_id, date);
