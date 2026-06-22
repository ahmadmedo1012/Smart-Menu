import { Composition } from "remotion";
import { IntroVideo } from "./IntroVideo";

export const RemotionRoot = () => {
  return (
    <Composition
      id="smart-menu-intro"
      component={IntroVideo}
      durationInFrames={150}
      fps={30}
      width={1080}
      height={1080}
    />
  );
};
