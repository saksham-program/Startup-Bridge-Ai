import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

const SECTIONS: LegalSection[] = [
  {
    id: "purpose",
    title: "Purpose of AI features",
    body: [
      "StartupBridge AI uses or may use artificial intelligence to support startup discovery, idea analysis, survey interpretation, problem classification, trend identification, and founder–investor recommendations.",
      "These features are intended to assist users in exploring opportunities and organising information. They do not replace independent research, professional judgement, or real-world validation.",
    ],
  },
  {
    id: "generated",
    title: "AI-generated information",
    body: [
      "AI-generated outputs may include summaries, classifications, validation signals, demand estimates, recommendations, and potential matches.",
      "Such outputs are generated from available inputs and the capabilities of the relevant AI systems. They may contain errors, omissions, outdated information, or misleading conclusions.",
      "Users should independently verify important claims and supporting information before relying on them.",
    ],
  },
  {
    id: "validation",
    title: "Idea validation and market demand",
    body: [
      "AI-assisted idea validation is intended to help founders examine assumptions, identify potential gaps, and explore possible market opportunities.",
      "An AI-generated validation score or demand signal does not guarantee that a startup idea is viable, commercially successful, profitable, or supported by actual market demand.",
      "Real validation requires appropriate evidence, such as customer interviews, representative surveys, market research, prototype testing, and observed user behaviour.",
    ],
  },
  {
    id: "matching",
    title: "Investor matching and recommendations",
    body: [
      "StartupBridge AI may suggest potential connections based on available profile information, stated preferences, industry, startup stage, or other relevant factors supported by the platform.",
      "An AI-suggested investor match does not mean that the investor has reviewed the startup, expressed interest, endorsed the business, or intends to provide funding.",
      "Users are responsible for independently evaluating potential partners, investors, and business opportunities.",
    ],
  },
  {
    id: "advice",
    title: "No professional advice",
    body: [
      "AI-generated content is not a substitute for qualified legal, financial, tax, investment, or other professional advice.",
      "Users should consult appropriate professionals when making decisions that require specialised expertise or carry significant financial, legal, or operational consequences.",
    ],
  },
  {
    id: "inputs",
    title: "User-submitted information",
    body: [
      "AI outputs may depend on the quality, completeness, accuracy, and relevance of information supplied by users.",
      "Incomplete, inaccurate, misleading, or unrepresentative information may produce unreliable results. Users should avoid submitting unnecessary personal information or confidential information belonging to third parties without appropriate authorisation.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy and AI processing",
    body: [
      "Information submitted to AI-powered features may be processed to provide the requested functionality, subject to the platform's actual implementation.",
      "When live AI features are enabled, selected inputs may be sent to a third-party AI gateway. When that provider is unavailable, a built-in analysis engine may be used instead.",
      "Users should consult the Privacy Policy for information about data collection, purposes, relevant third-party processing, visibility, retention, and available privacy choices.",
      "Users should not assume that every submitted idea, prompt, document, or conversation is automatically confidential.",
    ],
  },
  {
    id: "bias",
    title: "Bias and limitations",
    body: [
      "AI systems may reflect limitations or biases in their training data, inputs, or design. Recommendations may overlook relevant opportunities, disadvantage certain cases, or produce inconsistent results.",
      "AI-generated recommendations should be treated as assistance rather than definitive decisions. Where appropriate, users should review the reasoning, supporting evidence, and limitations of important outputs.",
    ],
  },
  {
    id: "responsibility",
    title: "Human responsibility",
    body: [
      "Users remain responsible for evaluating AI-generated information and deciding whether to act on it.",
      "StartupBridge AI does not guarantee the accuracy, completeness, suitability, or real-world success of AI-generated recommendations, startup ideas, demand signals, or investor matches.",
    ],
  },
  {
    id: "reporting",
    title: "Reporting incorrect outputs",
    body: [
      "If you believe an AI-generated output is misleading, inaccurate, inappropriate, or potentially harmful, use the in-app report options where they are available.",
      "Reported issues may be reviewed to identify errors and improve the platform's responsible use of AI, subject to available processes and technical capabilities.",
    ],
  },
  {
    id: "updates",
    title: "Updates to this disclaimer",
    body: [
      "This disclaimer may be revised as AI features, service providers, and applicable requirements evolve. Users should review the latest version when material changes are made.",
      "This disclaimer is intended to explain AI limitations and responsible use. It does not replace the Privacy Policy, applicable terms, or any legal obligations that apply to the platform.",
    ],
  },
];

export const Route = createFileRoute("/ai-disclaimer")({
  head: () => ({
    meta: [
      { title: "AI Disclaimer — StartupBridge AI" },
      {
        name: "description",
        content:
          "How to interpret AI-generated insights, validation scores, and matches on StartupBridge AI.",
      },
      { property: "og:title", content: "AI Disclaimer — StartupBridge AI" },
      {
        property: "og:description",
        content:
          "How to interpret AI-generated insights, validation scores, and matches on StartupBridge AI.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage
      title="AI Disclaimer"
      intro="StartupBridge AI uses or may use artificial intelligence to assist with discovery, analysis, and recommendations. These outputs are suggestions to support your judgement, not guarantees."
      sections={SECTIONS}
    />
  ),
});
