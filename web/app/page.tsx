import type { Metadata } from "next";
import LandingFrame from "@/components/landing/landing-frame";
import Hero from "@/components/landing/hero";
import Demo from "@/components/landing/demo";
import Pillars from "@/components/landing/pillars";
import Proof from "@/components/landing/proof";
import Honesty from "@/components/landing/honesty";
import Faq from "@/components/landing/faq";
import LandingFooter from "@/components/landing/footer";
import { DEMO_POSTER, REPO_URL, SITE_URL, YOUTUBE_URL } from "@/lib/landing-links";

export const metadata: Metadata = {
  title: "Recall - the company brain that shows its work",
  description:
    "An institutional-memory agent that answers with traced graph paths, predicts blast radius, and asks before it acts.",
  openGraph: {
    type: "website",
    url: SITE_URL,
    title: "Recall - the company brain that shows its work",
    description:
      "An institutional-memory agent that answers with traced graph paths, predicts blast radius, and asks before it acts.",
    images: [
      {
        url: `${SITE_URL}${DEMO_POSTER}`,
        width: 1280,
        height: 720,
        alt: "Recall: answers with proof, traced through a causal chain with sources cited",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Recall - the company brain that shows its work",
    description:
      "An institutional-memory agent that answers with traced graph paths, predicts blast radius, and asks before it acts.",
    images: [`${SITE_URL}${DEMO_POSTER}`],
  },
  alternates: { canonical: SITE_URL },
};

export default function Home() {
  return (
    <LandingFrame>
      {/* A div, not a <main>: the app shell already renders the document's
          single <main>, and nesting a second one is invalid HTML. */}
      <div>
        <Hero />
        <Demo />
        <Pillars />
        <Proof />
        <Honesty />
        <Faq />
      </div>
      <LandingFooter />
    </LandingFrame>
  );
}