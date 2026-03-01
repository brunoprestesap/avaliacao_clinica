-- Identificador (prontuário) único por usuário, não globalmente.
-- Corrige: duplicate key value violates unique constraint "pacientes_identificador_key"
-- quando outro usuário já tem o mesmo prontuário (RLS esconde a linha, mas a UNIQUE global falha no INSERT).

ALTER TABLE pacientes
  DROP CONSTRAINT IF EXISTS pacientes_identificador_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_user_id_identificador
  ON pacientes (user_id, identificador);
