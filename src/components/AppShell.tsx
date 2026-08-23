import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Swords,
  Trophy,
  BookOpen,
  LogOut,
  Terminal,
  Menu,
  X,
  Flame,
} from "lucide-react";

type Props = {
  titulo: string;
  nome: string;
  xp: number;
  isProfessor: boolean;
  onSair: () => void;
  children: ReactNode;
};

export function AppShell({ titulo, nome, xp, isProfessor, onSair, children }: Props) {
  const [aberto, setAberto] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const itens = [
    { to: "/painel", label: "Treinar", icon: LayoutDashboard },
    { to: "/progresso", label: "Minha evolução", icon: Trophy },
    ...(isProfessor ? [{ to: "/professor", label: "Base do professor", icon: BookOpen }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative z-10">
      <div className="md:hidden flex items-center justify-between p-4 glass-bar border-b divider z-50">
        <div className="flex items-center gap-2">
          <Terminal className="w-6 h-6 neon" />
          <span className="font-bold title-glow">DevOps Trainer</span>
        </div>
        <button onClick={() => setAberto(!aberto)} className="icon-btn" aria-label="Menu">
          {aberto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 glass-bar border-r flex flex-col justify-between transition-transform duration-300 ease-in-out bg-[#0a0810]/95 md:bg-transparent ${
          aberto ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div>
          <div className="hidden md:flex p-4 border-b divider items-center gap-2">
            <Terminal className="w-6 h-6 neon pulse-neon" />
            <span className="font-bold title-glow">DevOps Trainer</span>
          </div>

          <nav className="p-3 space-y-1.5 mt-14 md:mt-0">
            {itens.map((item) => {
              const Icon = item.icon;
              const ativo = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setAberto(false)}
                  className={`nav-item ${ativo ? "nav-item-active" : ""}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t divider">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl glass flex items-center justify-center shrink-0">
              <Swords className="w-4 h-4 neon" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{nome}</p>
              <p className="text-xs txt-faint">{isProfessor ? "Professor" : "Aluno"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3 text-xs txt-dim">
            <Flame className="w-4 h-4 neon-amber" />
            <span>
              <strong className="neon-amber">{xp}</strong> XP acumulado
            </span>
          </div>
          <button onClick={onSair} className="btn-ghost w-full">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {aberto && (
        <div
          onClick={() => setAberto(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      <div className="flex-1 overflow-x-hidden min-w-0">
        <header className="p-4 md:p-6 border-b divider glass-bar">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h1 className="text-xl md:text-2xl font-bold title-glow">{titulo}</h1>
            <span className="text-xs md:text-sm txt-dim">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
