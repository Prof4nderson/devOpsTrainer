import { createFileRoute } from "@tanstack/react-router";
import { CyberpunkTerminal } from "@/components/CyberpunkTerminal";

export const Route = createFileRoute("/terminal")({
  component: TerminalPage,
});

function TerminalPage() {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold text-cyan-400 mb-6 font-mono border-b border-cyan-800 pb-2">
        // Laboratório de Comandos - Terminal Ciberpunk
      </h1>
      <CyberpunkTerminal />
    </div>
  );
}