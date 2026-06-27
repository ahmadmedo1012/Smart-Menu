import { Player } from "@remotion/player"
import { PhoneMenuVideo } from "../../video/PhoneMenu"

export default function RemotionPlayerInner() {
	return (
		<Player
			component={PhoneMenuVideo}
			durationInFrames={720}
			fps={30}
			compositionWidth={390}
			compositionHeight={844}
			style={{ width: "100%", height: "100%", borderRadius: "2.3rem" }}
			autoPlay
			loop
			controls={false}
			moveToBeginningWhenEnded
		/>
	)
}
