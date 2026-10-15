"use client";

import AskScreen from "../../components/AskScreen";
import { useShell } from "../shell";

export default function AskPage() {
  const { user, graphDown } = useShell();
  return <AskScreen user={user} graphDown={graphDown} />;
}
