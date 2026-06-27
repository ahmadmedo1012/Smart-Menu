import { Composition } from "remotion"
import { PhoneMenuVideo } from "./PhoneMenu"

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="PhoneMenu"
				component={PhoneMenuVideo}
				durationInFrames={150}
				fps={30}
				width={220}
				height={460}
			/>
		</>
	)
}
