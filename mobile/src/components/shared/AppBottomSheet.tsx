/**
 * r126-M8 (A6 P2-9): the app's sheets were hand-rolled absolute Views — no
 * swipe-dismiss, no keyboard handling (the cart's 5 inputs sat behind the
 * keyboard), no safe-area bottom, no entrance animation — while
 * @gorhom/bottom-sheet (plus its reanimated/gesture-handler deps) was
 * installed with its provider mounted. This wrapper is the app's sheet on
 * top of BottomSheetModal:
 *
 * - swipe-to-dismiss + backdrop tap-to-close (dim 0.7, matches the old scrim)
 * - enter/exit 380ms ease-out — the Madarek --t-slow rung (mandate's
 *   240-380ms sheet band), instant under reduced-motion
 * - keyboardBehavior="interactive" — inputs scroll with the keyboard
 * - safe-area bottom padding on the pinned footer (home-indicator overlap)
 * - night surface + 20px top radius (ladder) + grabber handle
 *
 * Mount pattern: the parent renders <AppBottomSheet> only while the sheet
 * should be open; it presents itself on mount and calls onClose (after the
 * exit animation) on swipe/backdrop/programmatic dismiss.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from "react";
import { View } from "react-native";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  useBottomSheetTimingConfigs,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Easing } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useReducedMotion } from "@/components/motion/useReducedMotion";
import { colors } from "@/theme/colors";
import { motion } from "@/theme/motion";
import { bezierPoints, easings } from "@/theme/easings";

// r127-F8: rung centralized in theme/motion (same value — zero behavior change).
export const SHEET_DURATION_MS = motion.SLOW; // Madarek --t-slow (sheet enter/exit rung)
/** --ease-out (tokens.css:129) via the theme/easings SSOT — r130 W2-4
 * (was Easing.out(Easing.cubic), a different easeOutCubic curve). */
const EASE_OUT = Easing.bezier(...bezierPoints(easings.out));

export interface AppBottomSheetHandle {
  /** Animate the sheet out (onClose fires after the exit animation). */
  dismiss: () => void;
}

export interface AppBottomSheetProps {
  /** Snap points, Madarek-style content-first (default 70% → 92%). */
  snapPoints?: (string | number)[];
  /** Pinned header row (title + close affordance). */
  header?: ReactNode;
  /** Pinned footer (CTA) — gets safe-area bottom padding. */
  footer?: ReactNode;
  /** Fired once the sheet has fully closed, for ANY reason. */
  onClose: () => void;
  children: ReactNode;
}

export const AppBottomSheet = forwardRef<AppBottomSheetHandle, AppBottomSheetProps>(
  function AppBottomSheet({ snapPoints = ["70%", "92%"], header, footer, onClose, children }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const insets = useSafeAreaInsets();
    const reducedMotion = useReducedMotion();

    // r126-M4: 380ms ease-out on the motion ladder; reduced-motion → instant.
    const animationConfigs = useBottomSheetTimingConfigs({
      duration: reducedMotion ? 0 : SHEET_DURATION_MS,
      easing: EASE_OUT,
    });

    useEffect(() => {
      // The parent mounts this component only while the sheet should show —
      // present immediately; unmounting happens from onClose (after exit).
      sheetRef.current?.present();
    }, []);

    useImperativeHandle(ref, () => ({ dismiss: () => sheetRef.current?.dismiss() }), []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          opacity={0.7}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="close"
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        animationConfigs={animationConfigs}
        backgroundStyle={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          borderWidth: 1,
          borderColor: colors.hairline,
        }}
        handleIndicatorStyle={{ backgroundColor: colors.muted, width: 44 }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onDismiss={onClose}
      >
        <View style={{ flex: 1 }}>
          {header ? <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 }}>{header}</View> : null}
          <BottomSheetScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </BottomSheetScrollView>
          {footer ? (
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 8,
                // r126 (A6 P2-10): home-indicator / gesture-bar overlap —
                // the hand-rolled sheet ignored the bottom inset entirely.
                paddingBottom: Math.max(insets.bottom, 12),
                borderTopWidth: 1,
                borderColor: colors.hairline,
                backgroundColor: colors.surface,
              }}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </BottomSheetModal>
    );
  },
);

