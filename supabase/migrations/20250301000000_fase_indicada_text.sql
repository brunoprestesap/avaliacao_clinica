-- Fase indicada passa a ser string (Integral / Núcleo / Essência)
ALTER TABLE consultas
  DROP CONSTRAINT IF EXISTS consultas_fase_indicada_check;

ALTER TABLE consultas
  ALTER COLUMN fase_indicada TYPE text
  USING (
    CASE fase_indicada::integer
      WHEN 1 THEN 'Essência'
      WHEN 2 THEN 'Núcleo'
      WHEN 3 THEN 'Integral'
      WHEN 4 THEN 'Integral'
      ELSE NULL
    END
  );
