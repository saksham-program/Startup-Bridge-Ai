import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Compass, X } from "lucide-react";
import type { PrimaryRole } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type Step = { to: string; title: string; body: string };

export const TOURS: Record<PrimaryRole, Step[]> = {
  founder: [
    { to: "/dashboard", title: "Your founder dashboard", body: "See your startups, validation score, surveys and connections at a glance." },
    { to: "/problems", title: "Problem Hub", body: "Browse real problems shared by the community. Open one to see AI demand signals, votes and discussion." },
    { to: "/my-startup", title: "My Startup workspace", body: "Your demo startup is already set up with milestones and a private pitch deck. Edit details or add milestones here." },
    { to: "/surveys", title: "Validation surveys", body: "Open a survey and view its results to see charts and an AI summary built from seeded responses." },
    { to: "/ai-insights", title: "AI Insights", body: "Your validation score broken down by factor, with strengths, concerns and a recompute button." },
    { to: "/matches", title: "Investor matches", body: "Investors ranked by fit with the reasons for each match. Send a connection request from here." },
    { to: "/verification", title: "Verification", body: "Your verified-founder status, which helps investors trust your identity before funding conversations." },
    { to: "/messages", title: "Messages", body: "Chat with investors you've connected with — sample conversations are ready to read." },
  ],
  investor: [
    { to: "/dashboard", title: "Your investor dashboard", body: "Startups to discover, active connections and pending requests in one place." },
    { to: "/discover", title: "Discover startups", body: "Filter startups by industry and stage. Open any profile to see traction, team and validation score." },
    { to: "/discover", title: "Ask AI about a startup", body: "On a startup's profile, use “Ask about…” to get answers drawn only from its information, with sources cited." },
    { to: "/matches", title: "Your matches", body: "Startups ranked against your investment preferences, with the reasons behind each score." },
    { to: "/saved", title: "Saved", body: "Startups and problems you've bookmarked for later." },
    { to: "/connections", title: "Connections", body: "Accept or decline founder requests and see who you're connected with." },
    { to: "/verification", title: "Verification", body: "Your verified-investor status, which unlocks private pitch decks." },
  ],
  general_user: [
    { to: "/dashboard", title: "Welcome home", body: "Your overview of problems, surveys and startups to help with." },
    { to: "/problems", title: "Problem Hub", body: "Upvote, comment on and save problems you face. Share a new one with the button at the top." },
    { to: "/surveys", title: "Surveys", body: "Answer founder surveys to help them validate their ideas." },
    { to: "/discover", title: "Startups", body: "See the startups being built to solve community problems." },
    { to: "/contributions", title: "My Contributions", body: "Everything you've posted, commented on and answered." },
    { to: "/notifications", title: "Notifications", body: "Replies, survey invites and updates on problems you follow." },
  ],
};

const key = (role: PrimaryRole) => `sb-tour-done-${role}`;
export const START_TOUR_EVENT = "sb:start-tour";

export function GuidedTour({ role }: { role: PrimaryRole | null }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    if (!role) return;
    if (!localStorage.getItem(key(role))) setStep(0);
    const start = () => setStep(0);
    window.addEventListener(START_TOUR_EVENT, start);
    return () => window.removeEventListener(START_TOUR_EVENT, start);
  }, [role]);

  if (!role || step === null) return null;
  const steps = TOURS[role];
  const cur = steps[step];
  if (!cur) return null;

  function go(i: number) {
    setStep(i);
    navigate({ to: steps[i]!.to });
  }
  function close() {
    localStorage.setItem(key(role!), "1");
    setStep(null);
  }

  return (
    <div role="dialog" aria-label="Guided tour" className="fixed bottom-20 right-4 z-40 w-[calc(100%-2rem)] max-w-sm card-elevated p-5 shadow-lg animate-fade-up md:bottom-6">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-brand"><Compass className="h-3.5 w-3.5" /> Demo tour · {step + 1} of {steps.length}</p>
        <button onClick={close} aria-label="Close tour" className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>
      <Progress value={((step + 1) / steps.length) * 100} className="mt-2 h-1" />
      <h3 className="mt-3 font-semibold">{cur.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{cur.body}</p>
      <div className="mt-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" disabled={step === 0} onClick={() => go(step - 1)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
        {step < steps.length - 1 ? (
          <Button size="sm" onClick={() => go(step + 1)}>Next <ArrowRight className="ml-1 h-4 w-4" /></Button>
        ) : (
          <Button size="sm" onClick={close}>Finish</Button>
        )}
      </div>
    </div>
  );
}
