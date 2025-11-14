/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { logError } from "./log";
import { UserData } from "./data";
import { Signal, useSignalValue } from "./hooks/use-signal";

const REMOVE_ADS_PRODUCT_ID = "remove_ads";

const canRequestAdRemovalSignal = new Signal(false);

// optional dependency, we're allowed to fail here:
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
let iapModule: Awaited<typeof import("react-native-iap")> | undefined;

try {
  // eslint-disable-next-line
  iapModule = require("react-native-iap");
} catch {
  logError("IAP excluded from this build.");
}

export function isIapAvailable() {
  return iapModule != undefined;
}

export function initInAppPurchases(userDataSignal: Signal<UserData>) {
  if (iapModule == undefined) {
    return;
  }

  const promise = (async function () {
    const {
      ErrorCode,
      initConnection,
      purchaseUpdatedListener,
      finishTransaction,
      purchaseErrorListener,
      fetchProducts,
      getAvailablePurchases,
    } = iapModule;

    async function restorePurchases(userDataSignal: Signal<UserData>) {
      if (userDataSignal.get().removeAds) {
        return;
      }

      const purchases = await getAvailablePurchases();

      for (const purchase of purchases) {
        if (purchase.productId == REMOVE_ADS_PRODUCT_ID) {
          userDataSignal.set({ ...userDataSignal.get(), removeAds: true });
        }
      }
    }

    function updateProducts() {
      fetchProducts({ skus: [REMOVE_ADS_PRODUCT_ID] })
        .then((products: any[] | null) => {
          canRequestAdRemovalSignal.set((products?.length ?? 0) > 0);
        })
        .catch(logError);
    }

    await initConnection();
    await restorePurchases(userDataSignal).catch(() => logError);

    type PurchaseListener = Parameters<typeof purchaseUpdatedListener>[0];
    type Purchase = Parameters<PurchaseListener>[0];
    purchaseUpdatedListener((purchase: Purchase) => {
      const receipt = purchase.transactionId;

      if (receipt != null) {
        finishTransaction({ purchase, isConsumable: false })
          .then(() =>
            userDataSignal.set({ ...userDataSignal.get(), removeAds: true })
          )
          .catch(logError);
      }
    });

    const ignoredErrors = [ErrorCode.UserCancelled, ErrorCode.NetworkError];
    type PurchaseErrorListener = Parameters<typeof purchaseErrorListener>[0];
    type PurchaseError = Parameters<PurchaseErrorListener>[0];
    purchaseErrorListener((err: PurchaseError) => {
      if (err.code == undefined || !ignoredErrors.includes(err.code)) {
        logError(err);
      }
    });

    updateProducts();
  })();

  promise.catch(logError);
}

export function useCanRequestAdRemoval() {
  return useSignalValue(canRequestAdRemovalSignal);
}

export async function requestAdRemoval() {
  if (iapModule == undefined) {
    return;
  }

  const { requestPurchase } = iapModule;

  const purchaseParams: Parameters<typeof requestPurchase>[0] = {
    request: {
      android: {
        skus: [REMOVE_ADS_PRODUCT_ID],
      },
    },
    type: "in-app",
  };

  requestPurchase(purchaseParams).catch(() => {});
}
