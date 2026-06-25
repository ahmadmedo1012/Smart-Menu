import { Composition } from "remotion";
import { HeroDemo } from "./HeroDemo";

// Hero demo: 15 sec @ 30fps = 450 frames — slow, readable, cinematic
const HERO_TOTAL = 450;

export const RemotionRoot = () => {
  return (
    <Composition
      id="HeroDemo"
      component={HeroDemo}
      durationInFrames={HERO_TOTAL}
      fps={30}
      width={540}
      height={1170}
    />
  );
};
