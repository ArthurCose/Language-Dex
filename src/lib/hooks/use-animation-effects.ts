import { useLayoutEffect, useState } from "react";

export default function useAnimationEffects() {
  // animations that need to run after updating style outputRanges
  const [pendingEffect, setPendingEffect] = useState<(() => void)[]>([]);

  const pushEffect = (callback: () => void) => {
    setPendingEffect((effects) => {
      if (effects.length == 0) {
        return [callback];
      }

      effects.push(callback);
      return effects;
    });
  };

  useLayoutEffect(() => {
    for (const animate of pendingEffect) {
      animate();
    }

    // clear without updating
    pendingEffect.length = 0;
  }, [pendingEffect]);

  return pushEffect;
}
