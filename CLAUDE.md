# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Servidor de desenvolvimento (localhost:3000)
npm run build        # Build de produção
npm test             # Vitest (51 testes unitários)
npm run test:watch   # Vitest em modo watch
npm run lint         # ESLint
npm run lint:fix     # ESLint com auto-fix
```

Para rodar um único arquivo de teste:
```bash
npx vitest run src/domain/calculos.test.ts
```

## Arquitetura

Clean Architecture em três camadas:

```
src/domain/          → Lógica pura: tipos, cálculos, constantes
src/application/     → Use cases + ports (interfaces de repositório)
src/infrastructure/  → Implementações (Supabase, JSON, auth)
app/                 → Next.js App Router: pages, components, server actions
```

O fluxo de dependência é sempre de fora para dentro: `app → application → domain`. Infraestrutura implementa as interfaces de `application/ports.ts`.

## Padrões Críticos

**Mutações via Server Actions** — nenhuma API route separada para mutações (só `/api/auth/*` e `/api/avaliacao/[id]/pdf`). Toda ação começa com `"use server"` e valida a sessão.

**Multi-tenancy na aplicação** — não há RLS no Supabase. O `userId` é passado explicitamente para todos os repositórios via `container.ts`. O cliente Supabase server-side usa service role key.

**Persistência dupla** — variável de ambiente `PERSISTENCE=supabase|json`. Em desenvolvimento sem Supabase, os repositórios JSON em `src/infrastructure/repositories/*Json.ts` servem de fallback. A troca é transparente graças às interfaces de `ports.ts`.

**Desbloqueio de consulta** — consultas ficam bloqueadas após a fase estrutural. O acesso é liberado por senha da equipe de saúde, que gera um token HMAC-assinado (15 min) armazenado em cookie httpOnly. Implementado em `src/infrastructure/unlockPassword.ts` e `app/actions.ts`.

## Arquivos-Chave

| Arquivo | O que muda |
|---------|-----------|
| `src/domain/calculos.ts` | Lógica de classificação e fase (CLINICO_BOUNDARIES, ESTRUTURAL_BOUNDARIES, VARIACAO_THRESHOLDS) |
| `src/domain/types.ts` | Todos os tipos do domínio + type guards (`isConsultaComResultado`, `isConsultaFinalizada`) |
| `src/domain/constants.ts` | Labels de itens clínicos, pilares e escalas |
| `src/application/ports.ts` | Interfaces `ConsultaRepository`, `PacienteRepository`, `AvaliacaoUseCases` |
| `src/infrastructure/container.ts` | Injeção de dependência — ponto central que conecta use cases com repositórios |
| `app/actions.ts` | Server actions principais — identificar paciente, salvar formulários, desbloquear, calcular resultado |
| `app/auth-options.ts` | NextAuth (credentials + Google OAuth, JWT 7 dias) |
| `middleware.ts` | Proteção de rotas — libera `_next/static`, `favicon.ico`, `manifest.webmanifest`, imagens |

## Fluxo de Avaliação

```
/avaliacao/nova
  → identifica ou cria paciente
/avaliacao/[id]/clinico
  → 14 itens clínicos (C1–C14), escala 0–3
/avaliacao/[id]/estrutura
  → 9 pilares estruturais (P1–P9), escala 0–4
/avaliacao/[id]/bloqueado  →  /desbloquear  (senha equipe)
/avaliacao/[id]/gerar
  → calcula score clínico, média estrutural, fase, compara com consulta anterior
/avaliacao/[id]/resultado
  → exibe radares (Recharts) e impressão clínica
/api/avaliacao/[id]/pdf
  → PDF via @react-pdf/renderer (server-side)
```

## Lógica de Classificação (resumo)

Score clínico (0–42): ≤7 ESTAVEL · 8–17 LEVE · 18–28 MODERADO · ≥29 GRAVE
Média estrutural (0–4): ≤1.4 COMPROMETIDA · 1.5–2.4 INSTAVEL · 2.5–3.4 FUNCIONAL · ≥3.5 BEM_ESTRUTURADA
Fase INTEGRAL se: ideação (C14≥2) OR score≥29 OR (score≥21 AND estrutura≤2.5)
Fase NÚCLEO se: score≥11 OR estrutura<2.5
Fase ESSÊNCIA: caso contrário

## Ambiente

Variáveis obrigatórias (ver `.env.example`):
- `PERSISTENCE` — `json` (dev) ou `supabase` (prod)
- `NEXTAUTH_SECRET` e `NEXTAUTH_URL`
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Email: `RESEND_API_KEY`, `EMAIL_FROM` (para recuperação de senha)