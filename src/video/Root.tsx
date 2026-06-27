import { Composition } from "remotion"
import { PhoneMenuVideo } from "./PhoneMenu"

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="PhoneMenu"
				component={PhoneMenuVideo}
				durationInFrames={720}
				fps={30}
				width={390}
				height={844}
			/>
		</>
	)
}
