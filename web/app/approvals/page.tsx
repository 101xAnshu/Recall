"use client";

import ApprovalsScreen from "../../components/ApprovalsScreen";
import { useShell } from "../shell";

export default function ApprovalsPage() {
  const { user, graphDown } = useShell();
  return <ApprovalsScreen user={user} graphDown={graphDown} />;
}
