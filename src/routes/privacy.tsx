import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

const SECTIONS: LegalSection[] = [
  {
    id: "introduction",
    title: "Introduction",
    body: [
      "StartupBridge AI is an AI-powered platform designed to help founders, researchers, investors, and problem owners discover opportunities, validate startup ideas, analyse feedback, and connect with relevant stakeholders.",
      "This Privacy Policy explains how information may be collected, used, stored, and shared when users interact with our platform. Our objective is to promote transparency, responsible data handling, and user trust.",
    ],
  },
  {
    id: "collect",
    title: "Information we collect",
    body: [
      "Depending on the features used, the platform may process the following categories of information:",
    ],
    sub: [
      {
        title: "Account information",
        body: "Name, email address, password, and account-related metadata needed to create and sign in to an account.",
      },
      {
        title: "Profile information",
        body: "Professional background, role, location, bio, skills, industry, startup details, investor preferences, and similar profile fields you provide.",
      },
      {
        title: "Private contact details",
        body: "Phone number and account email stored as private contact details. These are intended not to appear on your public profile.",
      },
      {
        title: "User-submitted content",
        body: "Problem statements, startup ideas, business descriptions, surveys, survey answers, comments, votes, messages, and other content you post.",
      },
      {
        title: "Documents",
        body: "Pitch decks and other files submitted through supported features. Pitch decks are stored privately and may be shared through time-limited links.",
      },
      {
        title: "Usage information",
        body: "Interactions with platform features and technical information necessary for functionality, security, or operating the service.",
      },
      {
        title: "Communications",
        body: "Information provided when you submit in-app reports, notifications-related preferences, or other platform communications.",
      },
    ],
  },
  {
    id: "use",
    title: "How we use information",
    body: ["Information may be used for the following purposes, where applicable:"],
    list: [
      "Creating and managing user accounts.",
      "Providing startup discovery and idea-validation features.",
      "Analysing survey responses and identifying patterns.",
      "Classifying problems and identifying potentially similar submissions.",
      "Generating AI-assisted summaries, insights, and recommendations.",
      "Suggesting potentially relevant connections between founders and investors.",
      "Maintaining platform functionality, preventing misuse, and improving user experience.",
      "Responding to user queries and addressing privacy or security concerns.",
    ],
  },
  {
    id: "ai",
    title: "Artificial intelligence processing",
    body: [
      "Certain platform features may use artificial intelligence to process user-provided information and generate summaries, classifications, insights, or recommendations.",
      "When a live AI provider is configured, relevant inputs may be processed by a third-party AI gateway to generate those outputs. When that provider is unavailable, the platform may fall back to a built-in analysis engine that runs on the server.",
      "AI-generated results may be inaccurate or incomplete and should not be treated as independently verified facts.",
    ],
  },
  {
    id: "sharing",
    title: "Sharing and visibility of information",
    body: [
      "The visibility of user profiles, startup ideas, problem submissions, surveys, and documents depends on the platform's functionality and sharing settings.",
      "You can mark a profile public or private. Public profile fields may be shown to other users. Private contact details are intended not to be shown publicly.",
      "Startup profiles may be marked visible to investors. Pitch decks and similar documents are stored privately and, where the product allows, shared through time-limited links rather than as permanently public files.",
      "Users should review the visibility of their submissions before sharing commercially valuable information. Startup ideas, business plans, and pitch decks may contain confidential business information, even when that information is not personal data.",
      "This Privacy Policy does not, by itself, guarantee confidentiality or prevent authorised recipients from copying information they can access.",
      "Information may be processed by service providers that host the application, authenticate users, store files, or generate AI outputs, as needed to operate the platform and as required by law.",
    ],
  },
  {
    id: "security",
    title: "Data security",
    body: [
      "We aim to protect information through organisational and technical safeguards proportionate to the risks involved.",
      "Depending on the deployed implementation, safeguards may include authentication, role-based access, restricted document access with time-limited links, and monitoring for misuse.",
      "No online platform can guarantee absolute security.",
    ],
  },
  {
    id: "retention",
    title: "Data retention and deletion",
    body: [
      "Information is generally retained while your account is active or as needed to operate the service, and as required by applicable law.",
      "You can download a copy of data associated with your account from Settings.",
      "Self-service account deletion is not currently available in the product. To request account deletion, contact support from the email address on your account, as described in Settings. Deletion from backups or third-party processors, if any, may take additional time and is not guaranteed to be immediate.",
    ],
  },
  {
    id: "rights",
    title: "User rights and choices",
    body: [
      "Subject to applicable law and the platform's actual capabilities, users may have rights relating to access, correction, updating, deletion, withdrawal of consent where applicable, and raising concerns.",
      "In the current product you can edit your profile, change profile and startup visibility, block accounts, manage notification preferences, and download your data from Settings.",
      "Consent to the Terms & Conditions, Privacy Policy, and AI Disclaimer is recorded when an account is provisioned.",
    ],
  },
  {
    id: "third-parties",
    title: "Third-party services",
    body: [
      "The platform may rely on third-party providers for hosting, authentication, file storage, and AI processing, depending on its configuration.",
      "Those providers may process information under their applicable terms and privacy practices in order to deliver the requested functionality.",
      "The current application uses hosted authentication and database services to operate accounts, and may send selected inputs to an AI gateway when live AI features are enabled.",
    ],
  },
  {
    id: "children",
    title: "Children's privacy",
    body: [
      "StartupBridge AI is intended for adult professional use by founders, investors, and other users participating in startup discovery and validation.",
      "The current product does not include an age-gate or parental-consent process. If you believe a child has provided personal information through the platform, contact support from a verified account email so the matter can be reviewed.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: [
      "This Privacy Policy may be updated when platform features, data practices, or applicable legal requirements change.",
      "The version number shown at the top of this page changes when the policy is updated. Material changes should be communicated through appropriate channels where required.",
    ],
  },
  {
    id: "contact",
    title: "Contact and grievances",
    body: [
      "For privacy questions, data-related requests, or grievances, use the in-app reporting tools where available, or contact support from the email address on your account as described in Settings.",
      "A dedicated public privacy email address has not been published in this application. Do not send passwords, payment credentials, or unnecessary sensitive information when making a request.",
    ],
  },
];

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — StartupBridge AI" },
      {
        name: "description",
        content: "How StartupBridge AI collects, uses, and protects information.",
      },
      { property: "og:title", content: "Privacy Policy — StartupBridge AI" },
      {
        property: "og:description",
        content: "How StartupBridge AI collects, uses, and protects information.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <LegalPage
      title="Privacy Policy"
      intro="This Privacy Policy explains how information may be collected, used, stored, and shared when you interact with StartupBridge AI."
      sections={SECTIONS}
    />
  ),
});
