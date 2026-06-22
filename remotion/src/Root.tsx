import { Composition } from "remotion";
import { IntroVideo } from "./IntroVideo";
import { HeroIntro } from "./HeroIntro";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="smart-menu-intro"
        component={IntroVideo}
        durationInFrames={150}
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
    </>
  );
};
