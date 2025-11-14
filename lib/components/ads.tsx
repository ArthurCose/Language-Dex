import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { logError } from "../log";
import { useTheme } from "../contexts/theme";
import { UserData } from "../data";
import { useUserDataSignal } from "../contexts/user-data";
import { useSignalLens } from "../hooks/use-signal";

// optional dependency, we're allowed to fail here:
type ReactNativeGoogleMobileAds = Awaited<
  // @ts-ignore
  typeof import("react-native-google-mobile-ads")
>;

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
let adsModule: ReactNativeGoogleMobileAds | undefined;

try {
  // eslint-disable-next-line
  adsModule = require("react-native-google-mobile-ads");
} catch {
  logError("Ads excluded from this build.");
}

type AdsConsentInfo = Awaited<
  ReturnType<ReactNativeGoogleMobileAds["AdsConsent"]["getConsentInfo"]>
>;

const AdsConsentPrivacyOptionsRequirementStatus =
  adsModule?.AdsConsentPrivacyOptionsRequirementStatus;
const BannerAd = adsModule?.BannerAd;
const BannerAdSize = adsModule?.BannerAdSize;
const TestIds = adsModule?.TestIds;

let isMobileAdsStartCalled = false;
let adsConsentInfo: AdsConsentInfo | undefined;

function handleConsentInfo(consentInfo: AdsConsentInfo) {
  adsConsentInfo = consentInfo;

  if (consentInfo.canRequestAds) {
    startGoogleMobileAdsSDK().catch(logError);
  }
}

export function initAds(userData: UserData) {
  if (adsModule == undefined || userData.removeAds) {
    return;
  }

  const { AdsConsent } = adsModule;

  // 1. Request consent information and load/present a consent form if necessary.
  // 2. Check if you can initialize the Google Mobile Ads SDK in parallel
  // using consent obtained in the previous session.
  [
    AdsConsent.gatherConsent({ tagForUnderAgeOfConsent: true }),
    AdsConsent.getConsentInfo(),
  ].forEach((result) => result.then(handleConsentInfo).catch(logError));
}

export function showPrivacyOptionsForm() {
  adsModule?.AdsConsent.showPrivacyOptionsForm()
    .then(handleConsentInfo)
    .catch(logError);
}

export function isPrivacyOptionsFormRequired() {
  if (!AdsConsentPrivacyOptionsRequirementStatus) {
    return false;
  }

  return (
    adsConsentInfo?.privacyOptionsRequirementStatus ==
    AdsConsentPrivacyOptionsRequirementStatus.REQUIRED
  );
}

async function startGoogleMobileAdsSDK() {
  if (isMobileAdsStartCalled || adsModule == undefined) return;
  isMobileAdsStartCalled = true;

  const { default: mobileAds, MaxAdContentRating, AdsConsent } = adsModule;

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
    const [adsModuleLoaded] = useState(BannerAd != null);

    if (
      !adsModuleLoaded ||
      BannerAd == undefined ||
      TestIds == undefined ||
      BannerAdSize == undefined
    ) {
      return;
    }

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
            __DEV__ || !isMobileAdsStartCalled
              ? TestIds.BANNER
              : "ca-app-pub-1435328633777702/8919664433"
          }
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        />
      </View>
    );
  }
);
