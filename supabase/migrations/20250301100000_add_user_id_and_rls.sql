-- Multi-tenancy: dono do registro em pacientes
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_pacientes_user_id ON pacientes(user_id);

-- RLS: habilitar em ambas as tabelas
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;

-- Políticas em pacientes (apenas usuário dono)
CREATE POLICY "pacientes_select_own"
  ON pacientes FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "pacientes_insert_own"
  ON pacientes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "pacientes_update_own"
  ON pacientes FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "pacientes_delete_own"
  ON pacientes FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Políticas em consultas (acesso via paciente do usuário)
CREATE POLICY "consultas_select_own"
  ON consultas FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM pacientes
      WHERE pacientes.id = consultas.patient_id AND pacientes.user_id = auth.uid()
    )
  );

CREATE POLICY "consultas_insert_own"
  ON consultas FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM pacientes
      WHERE pacientes.id = consultas.patient_id AND pacientes.user_id = auth.uid()
    )
  );

CREATE POLICY "consultas_update_own"
  ON consultas FOR UPDATE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM pacientes
      WHERE pacientes.id = consultas.patient_id AND pacientes.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM pacientes
      WHERE pacientes.id = consultas.patient_id AND pacientes.user_id = auth.uid()
    )
  );

CREATE POLICY "consultas_delete_own"
  ON consultas FOR DELETE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM pacientes
      WHERE pacientes.id = consultas.patient_id AND pacientes.user_id = auth.uid()
    )
  );
