import { Composition } from "remotion";
import { SmartMenuIntro } from "./SmartMenuIntro";
import { HeroDemo } from "./HeroDemo";

// Hero demo: 15 sec @ 30fps = 450 frames — slow, readable, cinematic
const HERO_TOTAL = 450;

// Total: 70 + 70 + 70 - 15 - 15 = 180 frames
const SCENE = 70;
const TRANSITION = 15;
const TOTAL = SCENE * 3 - TRANSITION * 2;

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="smart-menu-intro"
        component={SmartMenuIntro}
        durationInFrames={TOTAL}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="HeroDemo"
        component={HeroDemo}
        durationInFrames={HERO_TOTAL}
        fps={30}
        width={540}
        height={1170}
      />
    </>
  );
};
