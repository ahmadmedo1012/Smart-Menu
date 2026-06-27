import { useCurrentFrame } from "remotion"

export const PhoneMenuVideo: React.FC = () => {
	const f = useCurrentFrame()

	return (
		<div style={{
			width: 390, height: 844,
			background: "#f66d0f",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			fontSize: 60,
			fontWeight: 700,
			color: "white",
			fontFamily: "system-ui, sans-serif",
			flexDirection: "column",
		}}>
			<div style={{ fontSize: 120 }}>{f}</div>
			<div>Smart Menu</div>
		</div>
	)
}
