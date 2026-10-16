import { redirect } from "next/navigation";

// The landing page lives at the root. This path used to hold it and is kept as
// a redirect so any earlier link still lands in the right place.
export default function LandingRedirect() {
  redirect("/");
}