import { AbsoluteFill, useCurrentFrame } from "remotion"
import { TransitionSeries, linearTiming } from "@remotion/transitions"
import { fade } from "@remotion/transitions/fade"
import { slide } from "@remotion/transitions/slide"
// import { LightLeak } from "@remotion/light-leaks"

import { Scene1_Brand } from "./scenes/Scene1_Brand"
import { Scene2_FoodShowcase } from "./scenes/Scene2_FoodShowcase"
import { Scene3_PhoneDemo } from "./scenes/Scene3_PhoneDemo"
import { Scene4_Features } from "./scenes/Scene4_Features"
import { Scene5_Stats } from "./scenes/Scene5_Stats"
import { Scene6_CTA } from "./scenes/Scene6_CTA"

/* ─── Helper: wrap scene to pass local frame ─── */
function Scene({ children, from, duration }: { children: (frame: number) => React.ReactNode; from: number; duration: number }) {
	const globalFrame = useCurrentFrame()
	const localFrame = Math.max(0, Math.min(globalFrame - from, duration))
	return <>{children(localFrame)}</>
}

export const PromoVideo: React.FC = () => {
	return (
		<AbsoluteFill style={{ background: "#070708" }}>
			<TransitionSeries>
				{/* S1: Brand */}
				<TransitionSeries.Sequence durationInFrames={150}>
					<Scene from={0} duration={150}>
						{(f) => <Scene1_Brand frame={f} />}
					</Scene>
				</TransitionSeries.Sequence>

				{/* Transition: slide */}
				<TransitionSeries.Transition
					presentation={slide({ direction: "from-bottom" })}
					timing={linearTiming({ durationInFrames: 20 })}
				/>

				{/* S2: Food Showcase */}
				<TransitionSeries.Sequence durationInFrames={150}>
					<Scene from={170} duration={150}>
						{(f) => <Scene2_FoodShowcase frame={f} />}
					</Scene>
				</TransitionSeries.Sequence>

				{/* Transition: fade */}
				<TransitionSeries.Transition
					presentation={fade()}
					timing={linearTiming({ durationInFrames: 20 })}
				/>

				{/* S3: Phone Demo */}
				<TransitionSeries.Sequence durationInFrames={180}>
					<Scene from={340} duration={180}>
						{(f) => <Scene3_PhoneDemo frame={f} />}
					</Scene>
				</TransitionSeries.Sequence>

				{/* Transition: slide */}
				<TransitionSeries.Transition
					presentation={slide({ direction: "from-right" })}
					timing={linearTiming({ durationInFrames: 20 })}
				/>

				{/* S4: Features */}
				<TransitionSeries.Sequence durationInFrames={150}>
					<Scene from={540} duration={150}>
						{(f) => <Scene4_Features frame={f} />}
					</Scene>
				</TransitionSeries.Sequence>

				{/* Transition: fade */}
				<TransitionSeries.Transition
					presentation={fade()}
					timing={linearTiming({ durationInFrames: 20 })}
				/>

				{/* S5: Stats */}
				<TransitionSeries.Sequence durationInFrames={120}>
					<Scene from={710} duration={120}>
						{(f) => <Scene5_Stats frame={f} />}
					</Scene>
				</TransitionSeries.Sequence>

				{/* Transition: slide */}
				<TransitionSeries.Transition
					presentation={slide({ direction: "from-bottom" })}
					timing={linearTiming({ durationInFrames: 20 })}
				/>

				{/* S6: CTA */}
				<TransitionSeries.Sequence durationInFrames={120}>
					<Scene from={850} duration={120}>
						{(f) => <Scene6_CTA frame={f} />}
					</Scene>
				</TransitionSeries.Sequence>
			</TransitionSeries>
		</AbsoluteFill>
	)
}
