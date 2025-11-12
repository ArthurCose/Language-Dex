import React, { useEffect } from "react";
import { View } from "react-native";
import mobileAds, {
  AdsConsent,
  AdsConsentInfo,
  AdsConsentPrivacyOptionsRequirementStatus,
  BannerAd,
  BannerAdSize,
  MaxAdContentRating,
  TestIds,
  // optional dependency, we're allowed to fail here:
  // @ts-ignore
} from "react-native-google-mobile-ads";
import { logError } from "../../log";
import { useTheme } from "../../contexts/theme";
import { UserData } from "../../data";
import { useUserDataSignal } from "../../contexts/user-data";
import { useSignalLens } from "../../hooks/use-signal";

const devEnvironment = false;

let isMobileAdsStartCalled = false;
let adsConsentInfo: AdsConsentInfo | undefined;

function handleConsentInfo(consentInfo: AdsConsentInfo) {
  adsConsentInfo = consentInfo;

  if (consentInfo.canRequestAds) {
    startGoogleMobileAdsSDK().catch(logError);
  }
}

export function initAds(userData: UserData) {
  if (userData.removeAds) {
    return;
  }

  // 1. Request consent information and load/present a consent form if necessary.
  // 2. Check if you can initialize the Google Mobile Ads SDK in parallel
  // using consent obtained in the previous session.
  [
    AdsConsent.gatherConsent({ tagForUnderAgeOfConsent: true }),
    AdsConsent.getConsentInfo(),
  ].forEach((result) => result.then(handleConsentInfo).catch(logError));
}

export function showPrivacyOptionsForm() {
  AdsConsent.showPrivacyOptionsForm().then(handleConsentInfo).catch(logError);
}

export function isPrivacyOptionsFormRequired() {
  return (
    adsConsentInfo?.privacyOptionsRequirementStatus ==
    AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
  );
}

async function startGoogleMobileAdsSDK() {
  if (isMobileAdsStartCalled) return;
  isMobileAdsStartCalled = true;

  await mobileAds().setRequestConfiguration({
    // Update all future requests suitable for parental guidance
    maxAdContentRating: MaxAdContentRating.G,

    // Indicates that you want your content treated as child-directed for purposes of COPPA.
    tagForChildDirectedTreatment: true,

    // Indicates that you want the ad request to be handled in a
    // manner suitable for users under the age of consent.
    tagForUnderAgeOfConsent: true,
  });

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

export const PracticeAd = React.memo(
  ({ onSizeChange }: { onSizeChange?: () => void }) => {
    const theme = useTheme();
    const userDataSignal = useUserDataSignal();
    const removeAds = useSignalLens(userDataSignal, (data) => data.removeAds);

    useEffect(() => {
      if (!adsConsentInfo?.canRequestAds || removeAds) {
        onSizeChange?.();
      }
    }, []);

    if (!adsConsentInfo?.canRequestAds || removeAds) {
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
              "practice",
            ],
          }}
          onSizeChange={onSizeChange}
          unitId={
            devEnvironment || !isMobileAdsStartCalled
              ? TestIds.BANNER
              : "ca-app-pub-1435328633777702/8919664433"
          }
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        />
      </View>
    );
  }
);
