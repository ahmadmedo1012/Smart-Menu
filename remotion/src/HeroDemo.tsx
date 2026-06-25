import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { PhoneFrame } from "./scenes/PhoneFrame";
import { MenuScroll } from "./scenes/MenuScroll";
import { ItemSelection } from "./scenes/ItemSelection";
import { QuantitySelect } from "./scenes/QuantitySelect";
import { WhatsAppSend } from "./scenes/WhatsAppSend";

const TRANSITION = 10;

type SceneDef = {
  start: number;
  duration: number;
  component: React.FC;
  zoom: number; // subtle camera push
};

export const HeroDemo: React.FC = () => {
  const frame = useCurrentFrame();

  // Global cinematic slow zoom — Ken Burns subtle push
  const globalZoom = interpolate(frame, [0, 450], [1, 1.05], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.43, 0, 0.32, 1),
  });

  // Vignette darkening — pulses subtly
  const vignetteOpacity = interpolate(frame, [0, 225, 450], [0.18, 0.08, 0.15], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
    easing: Easing.bezier(0.43, 0, 0.32, 1),
  });

  // 15 seconds total @ 30fps — slow, readable, premium
  const SCENE_PHONE = 100;
  const SCENE_MENU = 100;
  const SCENE_SELECT = 90;
  const SCENE_QUANTITY = 85;
  const SCENE_WHATSAPP = 110;

  let t = 0;
  const SCENE_DEFS: SceneDef[] = [
    { start: t, duration: SCENE_PHONE, component: PhoneFrame, zoom: 1 },
    (t = t + SCENE_PHONE - TRANSITION),
    { start: t, duration: SCENE_MENU, component: MenuScroll, zoom: 1.008 },
    (t = t + SCENE_MENU - TRANSITION),
    { start: t, duration: SCENE_SELECT, component: ItemSelection, zoom: 1.015 },
    (t = t + SCENE_SELECT - TRANSITION),
    { start: t, duration: SCENE_QUANTITY, component: QuantitySelect, zoom: 1.022 },
    (t = t + SCENE_QUANTITY - TRANSITION),
    { start: t, duration: SCENE_WHATSAPP, component: WhatsAppSend, zoom: 1.03 },
  ].filter((s): s is SceneDef => typeof s === "object");

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        overflow: "hidden",
      }}
    >
      {/* Global Ken Burns zoom layer */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          scale: `${globalZoom}`,
          transformOrigin: "50% 50%",
        }}
      >
        {/* Rich ambient background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 60%, oklch(0.72 0.14 75 / 0.04) 0%, transparent 70%), linear-gradient(180deg, #0a0a0a 0%, #000 50%, #0a0a0a 100%)",
          }}
        />

        {/* Gold atmospheric glow — slow orbit */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, oklch(0.72 0.14 75 / 0.06) 0%, transparent 60%)",
            transform: "translate(-50%, -50%)",
            filter: "blur(80px)",
          }}
        />

        {/* Second glow — lower */}
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "10%",
            width: 250,
            height: 250,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, oklch(0.72 0.14 75 / 0.04) 0%, transparent 60%)",
            filter: "blur(60px)",
          }}
        />

        {/* Scenes */}
        {SCENE_DEFS.map((scene) => (
          <Sequence
            key={scene.start}
            from={scene.start}
            durationInFrames={scene.duration + TRANSITION}
          >
            <scene.component />
          </Sequence>
        ))}
      </div>

      {/* Vignette overlay — darkens edges like cinema lens */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
          pointerEvents: "none",
        }}
      />

      {/* Subtle film grain overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.02,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
          backgroundSize: "256px 256px",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
