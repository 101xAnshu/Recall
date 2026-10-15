"use client";

import MemoryScreen from "../../components/MemoryScreen";
import { useShell } from "../shell";

export default function MemoryPage() {
  const { user, graphDown } = useShell();
  return <MemoryScreen user={user} graphDown={graphDown} />;
}
