import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

const SECTIONS: LegalSection[] = [
  {
    id: "registration",
    title: "User registration and account verification",
    body: [
      "Users must provide accurate and up-to-date information when creating an account.",
      "Users must not impersonate another person or create fake profiles.",
      "The platform may request additional information to verify a user's identity or review an investor profile.",
      "Identity verification does not guarantee an investor's financial ability, credibility, or intention to invest.",
      "Users are responsible for maintaining the security of their accounts.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy and data protection",
    body: [
      "The platform may collect personal information necessary to provide its services, such as account details, profile information, and user-submitted content.",
      "Personal information will be handled according to the platform's Privacy Policy and applicable data-protection laws.",
      "Users should not share passwords, banking credentials, or unnecessary sensitive personal information on the platform.",
      "Users may exercise applicable rights relating to their personal information, subject to relevant laws and procedures.",
      "Information will not be used for purposes unrelated to the stated service without an appropriate legal basis.",
    ],
  },
  {
    id: "ip",
    title: "Startup ideas and intellectual property",
    body: [
      "Users generally retain ownership of the original content and intellectual property they create and submit, subject to applicable law and any separate agreement.",
      "Submitting an idea does not automatically transfer its ownership to the platform.",
      "Users must have the necessary rights or permissions to upload content.",
      "Users should review the visibility settings before sharing business plans, surveys, documents, or other sensitive information.",
      "The platform cannot guarantee that publicly shared ideas will never be copied or misused.",
      "By submitting content, users grant StartupBridge AI permission to display and operate on that content as needed to provide the features they use, including discovery, matching, messaging, surveys, and AI-assisted analysis.",
    ],
  },
  {
    id: "investors",
    title: "Investor connections and financial disclaimer",
    body: [
      "The platform provides networking and discovery features to help founders and investors connect.",
      "The platform does not guarantee funding, investment returns, business success, or the accuracy of every user profile.",
      "Users should independently verify people and organisations before entering into financial or business agreements.",
      "Users are responsible for their own investment decisions and due diligence.",
      "The platform does not act as a bank or guarantee any transaction.",
      "Any future investment facilitation, investment advice, or handling of funds will be subject to applicable legal and regulatory requirements.",
    ],
  },
  {
    id: "ai",
    title: "AI tools and recommendations",
    body: [
      "AI features may categorise problems, analyse survey responses, suggest improvements, estimate idea-validation potential, and recommend connections.",
      "AI-generated scores and recommendations are for informational purposes only and are not guarantees of market demand, business success, or investment.",
      "AI outputs may be incomplete, inaccurate, or biased and should be reviewed by users.",
      "Users remain responsible for their business decisions and for checking important information independently.",
    ],
  },
  {
    id: "community",
    title: "Community guidelines and prohibited activities",
    body: ["Users must not:"],
    list: [
      "Create fraudulent profiles or make intentionally misleading claims.",
      "Scam, threaten, harass, or discriminate against other users.",
      "Post spam, unlawful content, or content that infringes another person's rights.",
      "Access another user's account or confidential information without permission.",
      "Misuse surveys, messaging, or the platform's AI tools.",
    ],
  },
  {
    id: "reports",
    title: "Reporting and enforcement",
    body: [
      "Users can report suspicious accounts or inappropriate content through the in-app report options.",
      "The platform may investigate reports and, where appropriate and lawful, remove content, restrict features, suspend accounts, or terminate accounts.",
    ],
  },
  {
    id: "payments",
    title: "Payments, fees, and financial security",
    body: [
      "The current platform provides networking and discovery without directly processing investments or holding investment funds.",
      "Users must not share bank passwords, payment PINs, or other confidential financial credentials.",
      "Any paid features introduced in the future will have applicable fees and payment terms disclosed before purchase.",
      "Refunds, where applicable, will be governed by the relevant refund policy and applicable law.",
      "If payment processing is introduced, the platform will assess appropriate payment providers, security measures, and legal requirements before implementation.",
    ],
  },
  {
    id: "suspension",
    title: "Account suspension, liability, and disputes",
    body: [
      "Users may stop using the platform. Account deletion currently requires contacting support from the email address on the account, as described in Settings.",
      "The platform may restrict or suspend accounts for violations of these terms, subject to applicable law and appropriate procedures.",
      "Users are responsible for their own content, communications, business decisions, and agreements with other users.",
      "To the extent permitted by law, the platform does not guarantee uninterrupted service or the accuracy of all user-generated content and AI outputs.",
      "Nothing in these terms excludes or limits liability where such exclusion or limitation is prohibited by law.",
      "Complaints and disputes should first be raised through the in-app reporting tools or by contacting support from the email address on your account. Applicable law and dispute procedures will govern further resolution.",
    ],
  },
  {
    id: "acceptance",
    title: "Acceptance of the terms",
    numbered: false,
    body: [
      "By selecting “I Agree,” creating an account, or using StartupBridge AI, you confirm that you have read and understood these Terms & Conditions and agree to follow them when using the platform.",
      "These Terms & Conditions should be read together with the Privacy Policy, Community Guidelines, AI Disclaimer, and any other policies applicable to the features you use.",
    ],
  },
];

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — StartupBridge AI" },
      {
        name: "description",
        content:
          "Terms governing registration, content, investor connections, AI tools, and use of StartupBridge AI.",
      },
      { property: "og:title", content: "Terms & Conditions — StartupBridge AI" },
      {
        property: "og:description",
        content:
          "Terms governing registration, content, investor connections, AI tools, and use of StartupBridge AI.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage
      title="Terms & Conditions"
      intro="Welcome to StartupBridge AI. Our platform helps founders discover real-world problems, validate startup ideas using AI-assisted tools, build teams, and connect with investors and other users. By creating an account or using the platform, you agree to the following Terms & Conditions."
      sections={SECTIONS}
    />
  ),
});
