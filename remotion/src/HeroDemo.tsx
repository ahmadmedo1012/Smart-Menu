import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { PhoneFrame } from "./scenes/PhoneFrame";
import { MenuScroll } from "./scenes/MenuScroll";
import { ItemSelection } from "./scenes/ItemSelection";
import { QuantitySelect } from "./scenes/QuantitySelect";
import { WhatsAppSend } from "./scenes/WhatsAppSend";

// Scene durations (frames) @ 30fps
const SCENE_PHONE = 60;
const SCENE_MENU = 50;
const SCENE_SELECT = 50;
const SCENE_QUANTITY = 55;
const SCENE_WHATSAPP = 70;

// Padding between scenes (blank hold)
const PAD = 5;

type SceneDef = { start: number; duration: number; component: React.FC };

const SCENE_DEFS: SceneDef[] = (() => {
  let t = 0;
  return [
    { start: t, duration: SCENE_PHONE, component: PhoneFrame },
    (t = t + SCENE_PHONE + PAD),
    { start: t, duration: SCENE_MENU, component: MenuScroll },
    (t = t + SCENE_MENU + PAD),
    { start: t, duration: SCENE_SELECT, component: ItemSelection },
    (t = t + SCENE_SELECT + PAD),
    { start: t, duration: SCENE_QUANTITY, component: QuantitySelect },
    (t = t + SCENE_QUANTITY + PAD),
    { start: t, duration: SCENE_WHATSAPP, component: WhatsAppSend },
  ].filter((s): s is SceneDef => typeof s === "object");
})();

export const HeroDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Background gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, #0a0a0a 0%, #000000 50%, #0a0a0a 100%)",
        }}
      />

      {SCENE_DEFS.map((scene) => (
        <Sequence
          key={scene.start}
          from={scene.start}
          durationInFrames={scene.duration}
        >
          <scene.component />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
