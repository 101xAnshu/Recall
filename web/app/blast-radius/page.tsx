"use client";

import BlastScreen from "../../components/BlastScreen";
import { useShell } from "../shell";

export default function BlastRadiusPage() {
  const { graphDown } = useShell();
  return <BlastScreen graphDown={graphDown} />;
}
