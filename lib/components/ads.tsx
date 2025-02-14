import { useEffect } from "react";
import { View } from "react-native";
import mobileAds, {
  AdsConsent,
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";
import { logError } from "../log";
import { useUserDataContext } from "../contexts/user-data";
import { useTheme } from "../contexts/theme";

let isMobileAdsStartCalled = false;

// 1. Request consent information and load/present a consent form if necessary.
// 2. Check if you can initialize the Google Mobile Ads SDK in parallel
// using consent obtained in the previous session.
// [AdsConsent.gatherConsent(), AdsConsent.getConsentInfo()].forEach((result) =>
//   result
//     .then(({ canRequestAds }) => {
//       if (canRequestAds) {
//         return startGoogleMobileAdsSDK();
//       }
//     })
//     .catch(logError)
// );

async function startGoogleMobileAdsSDK() {
  if (isMobileAdsStartCalled) return;
  isMobileAdsStartCalled = true;

  // (Optional, iOS) Handle Apple's App Tracking Transparency manually.
  const gdprApplies = await AdsConsent.getGdprApplies();
  const hasConsentForPurposeOne =
    gdprApplies && (await AdsConsent.getPurposeConsents()).startsWith("1");

  if (!gdprApplies || hasConsentForPurposeOne) {
    // Request ATT...
  }

  // Initialize the Google Mobile Ads SDK.
  await mobileAds().initialize();

  // Request an ad...
}

export function PuzzleAd({ onSizeChange }: { onSizeChange?: () => void }) {
  const [userData] = useUserDataContext();
  const theme = useTheme();

  useEffect(() => {
    if (userData.removeAds) {
      onSizeChange?.();
    }
  }, []);

  if (userData.removeAds) {
    return;
  }

  return (
    <View style={{ backgroundColor: theme.colors.borders }}>
      <BannerAd
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
          keywords: [
            "education",
            "learn",
            "learning",
            "language",
            "words",
            "word",
            "game",
            "puzzle",
          ],
        }}
        onSizeChange={onSizeChange}
        unitId={
          __DEV__ || !isMobileAdsStartCalled
            ? TestIds.BANNER
            : "ca-app-pub-1435328633777702/8919664433"
        }
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      />
    </View>
  );
}
