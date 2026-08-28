import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import type { Teoria } from "@/lib/challenges";

/** Card de teoria exibido antes do desafio, para o aluno estudar o assunto. */
export function TeoriaCard({ teoria, aberto = true }: { teoria: Teoria; aberto?: boolean }) {
  const [expandido, setExpandido] = useState(aberto);

  return (
    <div className="card">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2 min-w-0">
          <BookOpen className="w-4 h-4 neon shrink-0" />
          <span className="min-w-0">
            <span className="kicker block">Teoria do desafio</span>
            <span className="block text-sm font-semibold truncate">{teoria.titulo}</span>
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 txt-dim transition-transform ${expandido ? "rotate-180" : ""}`}
        />
      </button>

      {expandido && (
        <div className="mt-4 space-y-3">
          <p className="text-sm txt-dim leading-relaxed">{teoria.resumo}</p>
          {teoria.pontos?.length > 0 && (
            <ul className="space-y-1.5">
              {teoria.pontos.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="neon">▸</span>
                  <span className="txt-dim">{p}</span>
                </li>
              ))}
            </ul>
          )}
          {teoria.exemplo && (
            <pre className="code-area whitespace-pre-wrap">{teoria.exemplo}</pre>
          )}
        </div>
      )}
    </div>
  );
}
