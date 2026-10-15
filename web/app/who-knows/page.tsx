"use client";

import WhoKnowsScreen from "../../components/WhoKnowsScreen";
import { useShell } from "../shell";

export default function WhoKnowsPage() {
  const { graphDown } = useShell();
  return <WhoKnowsScreen graphDown={graphDown} />;
}
