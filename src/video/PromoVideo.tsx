import { AbsoluteFill } from "remotion"
import { TransitionSeries, linearTiming } from "@remotion/transitions"
import { fade } from "@remotion/transitions/fade"

import { Scene1_Brand } from "./scenes/Scene1_Brand"
import { Scene2_FoodMontage } from "./scenes/Scene2_FoodMontage"
import { Scene3_CTA } from "./scenes/Scene3_CTA"

export const PromoVideo: React.FC = () => {
	return (
		<AbsoluteFill style={{ background: "#000" }}>
			<TransitionSeries>
				<TransitionSeries.Sequence durationInFrames={120}>
					<Scene1_Brand />
				</TransitionSeries.Sequence>

				<TransitionSeries.Transition
					presentation={fade()}
					timing={linearTiming({ durationInFrames: 15 })}
				/>

				<TransitionSeries.Sequence durationInFrames={300}>
					<Scene2_FoodMontage />
				</TransitionSeries.Sequence>

				<TransitionSeries.Transition
					presentation={fade()}
					timing={linearTiming({ durationInFrames: 15 })}
				/>

				<TransitionSeries.Sequence durationInFrames={120}>
					<Scene3_CTA />
				</TransitionSeries.Sequence>
			</TransitionSeries>
		</AbsoluteFill>
	)
}
