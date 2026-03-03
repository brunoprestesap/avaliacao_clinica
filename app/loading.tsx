import { SkeletonLista } from "./components/SkeletonLista";

/** Loading state da página inicial (lista de pacientes) */
export default function Loading() {
  return (
    <div className="page-container">
      <div className="content-width-narrow flex flex-col gap-6">
        <div className="h-10 w-48 rounded-xl bg-muted animate-pulse" />
        <div className="flex items-center justify-between gap-4">
          <div className="h-10 flex-1 rounded-xl bg-muted animate-pulse" />
          <div className="h-10 w-36 rounded-xl bg-muted animate-pulse" />
        </div>
        <SkeletonLista itens={8} />
      </div>
    </div>
  );
}
