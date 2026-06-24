import { Composition } from "remotion";
import { IntroVideo } from "./IntroVideo";
import { HeroIntro } from "./HeroIntro";
import { TrustVideo } from "./TrustVideo";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="smart-menu-intro"
        component={IntroVideo}
        durationInFrames={178}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="hero-intro"
        component={HeroIntro}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="trust-video"
        component={TrustVideo}
        durationInFrames={225}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
