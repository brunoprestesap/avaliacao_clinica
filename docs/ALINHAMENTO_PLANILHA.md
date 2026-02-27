# Alinhamento: Planilha "Avaliação inicial - Dra Camila" e Aplicação

## Resumo

A planilha usada atualmente pela Dra. Camila contém duas abas principais: **Escala clínica** (14 itens, 0–3) e **Pilares da saúde mental** (9 pilares, 0–4). A aplicação já implementa a mesma estrutura de itens e cálculos; este documento alinha textos, instruções e rótulos de classificação para que a interface fique familiar à usuária.

---

## 1. Escala clínica (Formulário 1)

### 1.1 Instrução de período
- **Planilha:** "Para responder as perguntas, considere as últimas 2 semanas."
- **Aplicação:** Incluída acima do formulário clínico.

### 1.2 Escala 0–3 – rótulos
| Valor | Planilha | Aplicação (antes) | Aplicação (alinhado) |
|-------|----------|-------------------|----------------------|
| 0 | 0 – Não aconteceu | Ausente | Não aconteceu |
| 1 | 1 – Aconteceu poucos dias | Leve | Aconteceu poucos dias |
| 2 | 2 – Aconteceu mais da metade dos dias | Moderado | Aconteceu mais da metade dos dias |
| 3 | 3 – Aconteceu quase todos os dias ou com intensidade importante | Grave | Aconteceu quase todos os dias ou com intensidade importante |

### 1.3 Itens (14)
A planilha numera "Pergunta 1" a "Pergunta 14" em 3 blocos. O conteúdo equivale aos nossos itens C1–C14; a ordem na aplicação segue o requisito (C1–C14). Correspondência conceitual:

| Planilha (resumo) | ID app | Item app |
|-------------------|--------|----------|
| Triste, desanimado, sem esperança | C1 | Humor deprimido |
| Perdeu interesse/prazer | C3 | Anedonia |
| Sono | C7 | Sono |
| Cansaço/energia | C5 | Energia/fadiga |
| Apetite/peso | C8 | Apetite |
| Culpa/inadequado | C9 | Culpa/autocrítica |
| Concentração | C6 | Concentração |
| Lento ou inquieto | C11 | Agitação ou lentificação |
| Pensamentos de se machucar | C14 | Ideação suicida |
| Preocupado (BLOCO 2) | C2 | Ansiedade |
| Controlar preocupações | C10 | Desesperança |
| Tensão, irritabilidade, medo | C4 | Irritabilidade |
| Desempenho trabalho/estudos | C12 | Funcionamento ocupacional |
| Vida social/relacionamentos | C13 | Funcionamento social |

Os rótulos curtos da aplicação (C1–C14) são mantidos; a planilha usa perguntas longas que podem ser adoptadas em versão futura se desejado.

### 1.4 Score e classificação
- **Planilha:** "Score - Ansiedade / depressão"; classificação exemplo "Moderado - alto".
- **Aplicação:** Mantidos score 0–42 e faixas (0–7 estável, 8–17 leve, 18–28 moderado, 29–42 grave). Rótulos de exibição alinhados: "Estável", "Leve", "Moderado" / "Moderado - alto", "Grave".

---

## 2. Pilares da saúde mental (Formulário 2)

### 2.1 Instrução de período
- **Planilha:** "Para responder as perguntas, considere as últimas 4 semanas."
- **Aplicação:** Incluída acima do formulário de pilares.

### 2.2 Escala 0–4 – rótulos
| Valor | Planilha | Aplicação (alinhado) |
|-------|----------|----------------------|
| 0 | 0 – Muito ruim / totalmente desorganizado | Muito ruim / totalmente desorganizado |
| 1 | (Ruim) | Ruim |
| 2 | 2 – Regular | Regular |
| 3 | 3 – Bom | Bom |
| 4 | 4 – Muito bom / bem estruturado | Muito bom / bem estruturado |

### 2.3 Pilares (9)
Os nomes já coincidem: Sono, Alimentação, Controle do estresse, Atividade física, Relações sociais, Lazer, Uso de substâncias, Saúde física, Sexualidade. Nenhuma alteração necessária nos IDs ou rótulos.

### 2.4 Média e classificação
- **Planilha:** Média dos 9 pilares (0–4); "SCORE FINAL" com exemplo "Regular"; faixas noutra notação (0–10) com "Estrutura comprometida", "Estrutura instável", "Estrutura funcional", "Alta organização".
- **Aplicação:** Média 0–4 com 2 decimais; faixas 0–1.4, 1.5–2.4, 2.5–3.4, 3.5–4. Rótulos de exibição alinhados: "Comprometida", "Instável", "Funcional", "Alta organização" (em vez de "Bem estruturada").

---

## 3. O que foi alterado na aplicação

1. **Instruções:** "últimas 2 semanas" no formulário clínico; "últimas 4 semanas" no formulário de pilares.
2. **Escala clínica (0–3):** rótulos substituídos pelos textos da planilha (Não aconteceu, Aconteceu poucos dias, etc.).
3. **Escala estrutural (0–4):** rótulos 0 e 4 completados com o texto da planilha (Muito ruim / totalmente desorganizado; Muito bom / bem estruturado).
4. **Classificação estrutural:** "Bem estruturada" passou a ser exibida como "Alta organização" para coincidir com a planilha.
5. **Classificação clínica:** opção de exibir "Moderado - alto" para a faixa moderada (18–28), alinhado ao exemplo da planilha.

Cálculos (score, média, FASE, comparação, alerta C14) e regras de negócio permanecem conforme especificação técnica; apenas textos e rótulos foram alinhados à planilha.
