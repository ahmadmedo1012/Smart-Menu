import { AbsoluteFill } from "remotion"
import { TransitionSeries, linearTiming } from "@remotion/transitions"
import { fade } from "@remotion/transitions/fade"
import { slide } from "@remotion/transitions/slide"

import { Scene1_Brand } from "./scenes/Scene1_Brand"
import { Scene2_FoodShowcase } from "./scenes/Scene2_FoodShowcase"
import { Scene3_PhoneDemo } from "./scenes/Scene3_PhoneDemo"
import { Scene4_Features } from "./scenes/Scene4_Features"
import { Scene5_Stats } from "./scenes/Scene5_Stats"
import { Scene6_CTA } from "./scenes/Scene6_CTA"

export const PromoVideo: React.FC = () => {
	return (
		<AbsoluteFill style={{ background: "#070708" }}>
			<TransitionSeries>
				<TransitionSeries.Sequence durationInFrames={150}>
					<Scene1_Brand />
				</TransitionSeries.Sequence>

				<TransitionSeries.Transition
					presentation={slide({ direction: "from-bottom" })}
					timing={linearTiming({ durationInFrames: 20 })}
				/>

				<TransitionSeries.Sequence durationInFrames={150}>
					<Scene2_FoodShowcase />
				</TransitionSeries.Sequence>

				<TransitionSeries.Transition
					presentation={fade()}
					timing={linearTiming({ durationInFrames: 20 })}
				/>

				<TransitionSeries.Sequence durationInFrames={180}>
					<Scene3_PhoneDemo />
				</TransitionSeries.Sequence>

				<TransitionSeries.Transition
					presentation={slide({ direction: "from-right" })}
					timing={linearTiming({ durationInFrames: 20 })}
				/>

				<TransitionSeries.Sequence durationInFrames={150}>
					<Scene4_Features />
				</TransitionSeries.Sequence>

				<TransitionSeries.Transition
					presentation={fade()}
					timing={linearTiming({ durationInFrames: 20 })}
				/>

				<TransitionSeries.Sequence durationInFrames={120}>
					<Scene5_Stats />
				</TransitionSeries.Sequence>

				<TransitionSeries.Transition
					presentation={slide({ direction: "from-bottom" })}
					timing={linearTiming({ durationInFrames: 20 })}
				/>

				<TransitionSeries.Sequence durationInFrames={120}>
					<Scene6_CTA />
				</TransitionSeries.Sequence>
			</TransitionSeries>
		</AbsoluteFill>
	)
}
