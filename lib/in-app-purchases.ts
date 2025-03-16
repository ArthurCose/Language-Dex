import {
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  finishTransaction,
  flushFailedPurchasesCachedAsPendingAndroid,
  getAvailablePurchases,
  RequestPurchase,
  requestPurchase,
  getProducts,
  ErrorCode,
} from "react-native-iap";
import { logError } from "./log";
import { UserData } from "./data";
import { Signal } from "./hooks/use-signal";

const REMOVE_ADS_PRODUCT_ID = "remove_ads";
const ignoredErrors = [ErrorCode.E_USER_CANCELLED, ErrorCode.E_NETWORK_ERROR];

export function initInAppPurchases(userDataSignal: Signal<UserData>) {
  const promise = (async function () {
    await initConnection();
    await flushFailedPurchasesCachedAsPendingAndroid().catch(() => {
      // exception can happen here if:
      // - there are pending purchases that are still pending (we can't consume a pending purchase)
      // in any case, you might not want to do anything special with the error
    });
    await restorePurchases(userDataSignal).catch(() => logError);

    purchaseUpdatedListener((purchase) => {
      const receipt = purchase.transactionReceipt;

      if (receipt) {
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

    await getProducts({ skus: [REMOVE_ADS_PRODUCT_ID] });
  })();

  promise.catch(logError);
}

export async function requestAdRemoval() {
  const purchaseParams: RequestPurchase = {
    skus: [REMOVE_ADS_PRODUCT_ID],
    andDangerouslyFinishTransactionAutomaticallyIOS: false,
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
