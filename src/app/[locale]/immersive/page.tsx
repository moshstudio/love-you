import ImmersiveView from "@/components/ImmersiveView";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Immersive Experience 2026",
  description: "A 3D journey",
};

export default function ImmersivePage() {
  return <ImmersiveView />;
}
