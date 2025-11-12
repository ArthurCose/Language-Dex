import { log, logError } from "./log";
import { UserData } from "./data";
import { Signal } from "./hooks/use-signal";
import { useEffect, useState } from "react";

let iap: typeof import("./optional/in-app-purchases") | null = null;
const iapModule = import("./optional/in-app-purchases")
  .then((module) => (iap = module))
  .catch(() => {
    log("IAP excluded from this build.");
  });

export function isIapAvailable() {
  return !!iap;
}

export function initInAppPurchases(userDataSignal: Signal<UserData>) {
  // reading from the promise, as we don't want to risk operation order bugs
  iapModule
    .then((module) => {
      if (module) {
        return module.initInAppPurchases(userDataSignal);
      }
    })
    .catch(logError);
}

export function useCanRequestAdRemoval() {
  const [canRequest, setCanRequest] = useState(
    iap?.canRequestAdRemovalSignal.get() ?? false
  );

  useEffect(() => {
    const listener = (b: boolean) => setCanRequest(b);

    if (iap) {
      iap.canRequestAdRemovalSignal.subscribe(listener);
    }

    return () => {
      if (iap) {
        iap.canRequestAdRemovalSignal.unsubscribe(listener);
      }
    };
  }, []);

  return canRequest;
}

export async function requestAdRemoval() {
  const module = await iapModule;

  if (module) {
    await module.requestAdRemoval();
  }
}
