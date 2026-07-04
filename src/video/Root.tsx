import { Composition } from "remotion"
import { PromoVideo } from "./PromoVideo"
import { DURATION, FPS } from "./shared"

export const RemotionRoot: React.FC = () => (
	<Composition
		id="SmartMenuPromo"
		component={PromoVideo}
		durationInFrames={DURATION}
		fps={FPS}
		width={1080}
		height={1920}
	/>
)
