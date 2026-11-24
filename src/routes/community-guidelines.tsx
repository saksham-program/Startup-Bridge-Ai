import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

const SECTIONS: LegalSection[] = [
  {
    id: "honest",
    title: "Honest and genuine profiles",
    body: [
      "Users must provide accurate information and must not create fake accounts, impersonate others, or misrepresent their professional background.",
    ],
  },
  {
    id: "respect",
    title: "Respect others",
    body: [
      "Treat every user with respect. Harassment, threats, hate speech, discrimination, and abusive behaviour are not permitted.",
    ],
  },
  {
    id: "ideas",
    title: "Respect startup ideas",
    body: [
      "Do not copy, publish, or share another user's private startup ideas, business plans, or documents without permission.",
    ],
  },
  {
    id: "scams",
    title: "No scams or misleading claims",
    body: [
      "Users must not make fraudulent investment promises, misrepresent their business, or deceive others for financial or personal gain.",
    ],
  },
  {
    id: "relevant",
    title: "Share relevant content",
    body: [
      "Post genuine problems, meaningful survey responses, and relevant startup discussions. Spam, misleading promotions, and repeated irrelevant posts are prohibited.",
    ],
  },
  {
    id: "privacy",
    title: "Protect privacy",
    body: [
      "Do not share another person's personal information, private messages, or contact details without appropriate permission.",
    ],
  },
  {
    id: "report",
    title: "Report suspicious activity",
    body: [
      "Users are encouraged to report fake profiles, scams, inappropriate content, and violations of these guidelines to the platform administrators using the in-app report options.",
    ],
  },
  {
    id: "consequences",
    title: "Consequences of violations",
    numbered: false,
    body: [
      "Depending on the severity of a violation, the platform may remove content, issue warnings, restrict features, suspend accounts, or terminate accounts, subject to applicable law and appropriate procedures.",
    ],
  },
  {
    id: "commitment",
    title: "Our commitment",
    numbered: false,
    body: [
      "We aim to maintain a community that encourages innovation, collaboration, honesty, and respect. By using the platform, users are expected to follow these guidelines alongside the Terms & Conditions.",
    ],
  },
];

export const Route = createFileRoute("/community-guidelines")({
  head: () => ({
    meta: [
      { title: "Community Guidelines — StartupBridge AI" },
      {
        name: "description",
        content:
          "Community standards for honest profiles, respect, relevant content, and reporting on StartupBridge AI.",
      },
      { property: "og:title", content: "Community Guidelines — StartupBridge AI" },
      {
        property: "og:description",
        content:
          "Community standards for honest profiles, respect, relevant content, and reporting on StartupBridge AI.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage
      title="Community Guidelines"
      intro="Our goal is to create a safe, respectful, and trustworthy community where founders, investors, community users, and potential team members can connect, share ideas, and collaborate. All users are expected to follow these guidelines."
      sections={SECTIONS}
    />
  ),
});
