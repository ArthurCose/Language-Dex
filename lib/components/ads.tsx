import React, { useEffect, useState } from "react";
import { log } from "../log";
import { UserData } from "../data";

const adsModule = import("./optional/ads").catch(() => {
  log("Ads excluded from this build.");
});

export function initAds(userData: UserData) {
  adsModule.then((adsModule) => {
    if (adsModule) {
      adsModule.initAds(userData);
    }
  });
}

export function showPrivacyOptionsForm() {
  adsModule.then((adsModule) => {
    if (adsModule) {
      adsModule.showPrivacyOptionsForm();
    }
  });
}

export function isPrivacyOptionsFormRequired() {
  let result = false;

  adsModule.then((adsModule) => {
    if (adsModule) {
      result = adsModule.isPrivacyOptionsFormRequired();
    }
  });

  return result;
}

export function PracticeAd({ onSizeChange }: { onSizeChange?: () => void }) {
  const [node, setNode] = useState<React.ReactNode>(null);

  useEffect(() => {
    adsModule.then((adsModule) => {
      if (adsModule) {
        setNode(<adsModule.PracticeAd onSizeChange={onSizeChange} />);
      }
    });
  }, [onSizeChange]);

  return node;
}
