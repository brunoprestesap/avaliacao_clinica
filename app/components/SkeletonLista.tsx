/** Skeleton genérico para listas de cards — usado em loading.tsx das rotas */
export function SkeletonLista({ itens = 5 }: { itens?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando...">
      {Array.from({ length: itens }).map((_, i) => (
        <div key={i} className="h-16 w-full rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}
