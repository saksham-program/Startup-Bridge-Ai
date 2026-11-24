import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircleQuestion, Loader2, Send, Sparkles } from "lucide-react";
import { askStartupQuestion, type QaAnswer } from "@/lib/startup-qa.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { errorMessage } from "@/lib/utils-app";

const SUGGESTED = [
  "What evidence of demand does this startup have?",
  "What are the biggest risks based on this profile?",
  "How will they use the funding they're raising?",
  "What relevant experience does the founding team have?",
];

type Turn = { q: string; a?: QaAnswer; error?: string };

export function InvestorQA({ startupId, startupName }: { startupId: string; startupName: string }) {
  const ask = useServerFn(askStartupQuestion);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  async function submit(q: string) {
    const text = q.trim();
    if (text.length < 3 || busy) return;
    setBusy(true);
    setQuestion("");
    setTurns((t) => [{ q: text }, ...t]);
    try {
      const a = await ask({ data: { startupId, question: text } });
      setTurns((t) => t.map((x, i) => (i === 0 ? { ...x, a } : x)));
    } catch (e) {
      setTurns((t) => t.map((x, i) => (i === 0 ? { ...x, error: errorMessage(e) } : x)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section data-tour="investor-qa" className="ai-surface overflow-hidden">
      <div className="border-b bg-brand-soft/35 p-5 sm:p-6">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground shadow-glow"><MessageCircleQuestion className="h-4 w-4" /></span>
        <div className="min-w-0">
          <span className="ai-badge mb-2"><Sparkles className="h-3 w-3" /> AI research assistant</span>
          <h2 className="font-semibold">Ask about {startupName}</h2>
          <p className="text-sm text-muted-foreground">Answers use only this startup's profile, team, milestones and analyses, with sources cited. Not investment advice.</p>
        </div>
        </div>
      </div>
      <div className="space-y-5 p-5 sm:p-6">
      <form onSubmit={(e) => { e.preventDefault(); void submit(question); }} className="space-y-3">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(question); } }}
          placeholder="e.g. What traction or validation do they have so far?"
          maxLength={600}
          rows={2}
        />
        <div className="flex flex-wrap items-center gap-2">
          {SUGGESTED.map((s) => (
            <button key={s} type="button" disabled={busy} onClick={() => void submit(s)} className="rounded-full border bg-card px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-foreground disabled:opacity-50">{s}</button>
          ))}
          <Button type="submit" size="sm" className="ml-auto" disabled={busy || question.trim().length < 3}>
            {busy ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Thinking…</> : <><Send className="mr-1 h-4 w-4" /> Ask</>}
          </Button>
        </div>
      </form>
      {turns.length > 0 && (
        <ul className="space-y-4">
          {turns.map((t, i) => (
            <li key={turns.length - i} className="rounded-xl border bg-surface/70 p-4 shadow-sm">
              <p className="text-sm font-semibold">{t.q}</p>
              {!t.a && !t.error && <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Reviewing the startup's information…</p>}
              {t.error && <p className="mt-2 text-sm text-destructive">{t.error}</p>}
              {t.a && (
                <>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{t.a.answer}</p>
                  {t.a.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {t.a.sources.map((s) => <Badge key={s.id} variant="secondary">[{s.id}] {s.label}</Badge>)}
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      </div>
    </section>
  );
}
