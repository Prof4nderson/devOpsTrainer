import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { AppShell } from "@/components/AppShell";
import { CyberpunkTerminal } from "@/components/CyberpunkTerminal";

export const Route = createFileRoute("/terminal")({
  head: () => ({
    meta: [
      { title: "Cyber Lab — Terminal DevOps gamificado" },
      {
        name: "description",
        content:
          "Pratique Bash, PowerShell, Docker, Kubernetes e Git em um terminal simulado com tutor de IA, XP, combos, missões e ranking.",
      },
      { property: "og:title", content: "Cyber Lab — Terminal DevOps gamificado" },
      {
        property: "og:description",
        content: "Terminal simulado com tutor de IA que explica erros e acertos, missões, conquistas e ranking.",
      },
    ],
  }),
  component: TerminalPage,
});

function TerminalPage() {
  const navigate = useNavigate();
  const { user, perfil, isProfessor, loading, sair } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  const sairEIr = async () => {
    await sair();
    navigate({ to: "/" });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-4 neon animate-spin" />
      </div>
    );
  }

  return (
    <AppShell
      titulo="Labs DevOps Arena"
      nome={perfil?.nome ?? "Aluno"}
      xp={perfil?.xp ?? 0}
      isProfessor={isProfessor}
      onSair={sairEIr}
    >
      <CyberpunkTerminal user={user} />
    </AppShell>
  );
}
