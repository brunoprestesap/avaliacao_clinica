# Auditoria: Vercel React Best Practices

Resumo de como o projeto **avaliacao** se alinha ao guia [Vercel React Best Practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) e o que considerar em evoluções futuras.

---

## Já aderente

### 1. Eliminação de waterfalls (CRITICAL)
- **1.4 Promise.all() para operações independentes**: Páginas usam `Promise.all` onde faz sentido (ex.: `app/avaliacao/historico/[patientId]/page.tsx`: `params`, `searchParams` e `getAuthenticatedUseCases()` em paralelo; em seguida `obterPaciente` e `listarHistoricoPaciente` em paralelo). Home (`app/page.tsx`) faz `Promise.all([searchParams, getAuthenticatedUseCases()])` antes de `listarPacientes`.
- **1.1 Defer await**: A action `atualizarPaciente` valida `patientId`, `nome` e `identificador` (síncrono) antes de chamar `getAuthenticatedUseCases()` e o use case, evitando trabalho desnecessário em payload inválido.

### 2. Bundle size (CRITICAL)
- **2.1 Barrel imports**: `next.config.ts` já usa `experimental.optimizePackageImports: ["lucide-react", "radix-ui"]`, transformando imports de barrel em imports diretos em build (regra 2.1). Os imports atuais de `lucide-react` e `radix-ui` podem permanecer no estilo `import { X } from 'lucide-react'`.

### 3. Server-side (HIGH)
- **3.1 Autenticação em Server Actions**: Todas as server actions que alteram dados chamam `getAuthenticatedUseCases()` (ou equivalente) e validam sessão antes de executar a lógica. Nenhuma mutação depende só de middleware ou de guard em página.
- **3.6 Paralelização com composição**: O histórico do paciente obtém `uc` e parâmetros em paralelo e só depois dispara em paralelo as chamadas que dependem de `patientId` e `uc`, sem waterfall evitável.

### 4. Re-render e rendering (MEDIUM)
- **5.11 / 6.9 useTransition para atualizações não urgentes**: O dialog de edição de paciente (`EditarPacienteDialog`) usa `useTransition` no submit da action, marcando a atualização como não urgente e evitando estado de loading manual redundante.
- **6.8 Condicional explícito**: Onde o valor pode ser falsy numérico ou string vazia, o código usa ternário (`error ? (...) : null`) em vez de `&&` para evitar renderizar `0` ou string vazia.

### 5. Serialização RSC (3.2 / 3.5)
- **Minimizar e não duplicar em props**: Para o histórico, apenas o objeto `paciente` (com `id`, `nome`, `identificador`) é passado ao client; não há derivações redundantes (ex.: `paciente` e cópia ordenada) nas props.

---

## Recomendações futuras

| Regra | Onde | Sugestão |
|-------|------|----------|
| **1.5 Suspense boundaries** | Páginas com fetch (ex.: home, histórico) | Se quiser first paint ainda mais rápido, extrair o bloco que depende de `listarPacientes` / `obterPaciente`+`listarHistoricoPaciente` para um Server Component filho e envolvê-lo em `<Suspense fallback={...}>`. Avaliar trade-off com layout shift. |
| **2.4 Dynamic imports** | Componentes pesados | Se forem adicionados editores (ex.: Monaco), gráficos pesados ou libs grandes, carregá-los com `next/dynamic` e `ssr: false` onde fizer sentido. |
| **3.7 React.cache()** | `getAuthenticatedUseCases` / sessão | Se em uma mesma requisição a sessão for lida em vários pontos, considerar envolver a leitura de sessão em `cache()` para deduplicar por request. |
| **3.8 after()** | Actions com logging/analytics | Para logging ou métricas pós-mutação, usar `after()` do Next.js para não atrasar a resposta. |
| **4.3 SWR** | Listagens ou dados reutilizados no client | Se houver refetch no client (ex.: lista de pacientes após edição), avaliar SWR para dedup e cache em vez de apenas `router.refresh()`. |
| **5.10 Lazy state init** | `useState(initial)` com valor custoso | Se algum estado inicial exigir cálculo ou criação de objeto pesado, usar `useState(() => computeInitial())`. |

---

## Referência rápida por prioridade

- **CRITICAL**: Waterfalls (1.x), Bundle (2.x), Auth em actions (3.1) — cobertos ou mitigados.
- **HIGH**: Paralelização server (3.6), Serialização (3.5), Cache (3.3, 3.4) — aplicar conforme crescimento do app.
- **MEDIUM**: useTransition (5.11/6.9), Condicionais (6.8), Event handlers vs effects (5.7) — já usados onde aplicável.
- **LOW**: LRU cross-request (3.3), passive listeners (4.2), otimizações JS (7.x) — quando houver necessidade concreta de performance.

Guia completo (AGENTS.md) e regras individuais: [vercel-labs/agent-skills – react-best-practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices).
