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
  Purchase,
  PurchaseError,
  // optional dependency, we're allowed to fail here:
  // @ts-ignore
} from "react-native-iap";
import { logError } from "../log";
import { UserData } from "../data";
import { Signal } from "../hooks/use-signal";

const REMOVE_ADS_PRODUCT_ID = "remove_ads";
const ignoredErrors = [ErrorCode.UserCancelled, ErrorCode.NetworkError];

export function initInAppPurchases(userDataSignal: Signal<UserData>) {
  const promise = (async function () {
    await initConnection();
    await restorePurchases(userDataSignal).catch(() => logError);

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

    purchaseErrorListener((err: PurchaseError) => {
      if (err.code == undefined || !ignoredErrors.includes(err.code)) {
        logError(err);
      }
    });

    updateProducts();
  })();

  promise.catch(logError);
}

export const canRequestAdRemovalSignal = new Signal(false);

function updateProducts() {
  fetchProducts({ skus: [REMOVE_ADS_PRODUCT_ID] })
    .then((products: any[] | null) => {
      canRequestAdRemovalSignal.set((products?.length ?? 0) > 0);
    })
    .catch(logError);
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
