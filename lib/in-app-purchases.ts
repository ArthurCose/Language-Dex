import {
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  finishTransaction,
  getAvailablePurchases,
  MutationRequestPurchaseArgs,
  requestPurchase,
  fetchProducts,
  ErrorCode,
} from "react-native-iap";
import { logError } from "./log";
import { UserData } from "./data";
import { Signal, useSignalValue } from "./hooks/use-signal";
import { useEffect, useState } from "react";

const REMOVE_ADS_PRODUCT_ID = "remove_ads";
const ignoredErrors = [ErrorCode.UserCancelled, ErrorCode.NetworkError];

export function initInAppPurchases(userDataSignal: Signal<UserData>) {
  const promise = (async function () {
    await initConnection();
    await restorePurchases(userDataSignal).catch(() => logError);

    purchaseUpdatedListener((purchase) => {
      const receipt = purchase.transactionId;

      if (receipt != null) {
        finishTransaction({ purchase, isConsumable: false })
          .then(() =>
            userDataSignal.set({ ...userDataSignal.get(), removeAds: true })
          )
          .catch(logError);
      }
    });

    purchaseErrorListener((err) => {
      if (err.code == undefined || !ignoredErrors.includes(err.code)) {
        logError(err);
      }
    });

    updateProducts();
  })();

  promise.catch(logError);
}

const canRequestAdRemovalSignal = new Signal(false);

function updateProducts() {
  fetchProducts({ skus: [REMOVE_ADS_PRODUCT_ID] })
    .then((products) =>
      canRequestAdRemovalSignal.set((products?.length ?? 0) > 0)
    )
    .catch(logError);
}

export function useCanRequestAdRemoval() {
  useEffect(() => {
    if (!canRequestAdRemovalSignal.get()) {
      updateProducts();
    }
  }, []);

  return useSignalValue(canRequestAdRemovalSignal);
}

export async function requestAdRemoval() {
  const purchaseParams: MutationRequestPurchaseArgs = {
    request: {
      android: {
        skus: [REMOVE_ADS_PRODUCT_ID],
      },
    },
    type: "in-app",
  };

  requestPurchase(purchaseParams).catch(() => {});
}

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
