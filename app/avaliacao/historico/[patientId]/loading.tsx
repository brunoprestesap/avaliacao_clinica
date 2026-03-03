import { SkeletonLista } from "@/app/components/SkeletonLista";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

/** Loading state da página de histórico do paciente */
export default function Loading() {
  return (
    <div className="page-container">
      <div className="content-width-medium flex flex-col gap-6">
        <div className="h-5 w-32 rounded-lg bg-muted animate-pulse" />
        <Card className="border-border/80 shadow-[var(--shadow-card)]">
          <CardHeader className="pb-4">
            <div className="h-8 w-56 rounded-lg bg-muted animate-pulse mb-2" />
            <div className="h-4 w-40 rounded-lg bg-muted animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-4 w-32 rounded-lg bg-muted animate-pulse mb-4" />
            <SkeletonLista itens={5} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
