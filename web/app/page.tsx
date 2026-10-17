import type { Metadata } from "next";
import LandingFrame from "@/components/landing/landing-frame";
import Hero from "@/components/landing/hero";
import Demo from "@/components/landing/demo";
import Pillars from "@/components/landing/pillars";
import Proof from "@/components/landing/proof";
import Honesty from "@/components/landing/honesty";
import Faq from "@/components/landing/faq";
import LandingFooter from "@/components/landing/footer";

export const metadata: Metadata = {
  title: "Recall - the company brain that shows its work",
  description:
    "An institutional-memory agent that answers with traced graph paths, predicts blast radius, and asks before it acts.",
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