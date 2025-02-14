import mobileAds, {
  AdsConsent,
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";
import { logError } from "../log";
import { useUserDataContext } from "../contexts/user-data";
import { useEffect } from "react";

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

  useEffect(() => {
    if (!isMobileAdsStartCalled || userData.removeAds) {
      onSizeChange?.();
    }
  }, []);

  if (!isMobileAdsStartCalled || userData.removeAds) {
    return;
  }

  return (
    <BannerAd
      requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      onSizeChange={onSizeChange}
      unitId={
        __DEV__ ? TestIds.BANNER : "ca-app-pub-1435328633777702/8919664433"
      }
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
    />
  );
}
