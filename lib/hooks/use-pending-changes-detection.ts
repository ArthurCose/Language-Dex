import { useEffect, useState } from "react";

export function usePendingChangesDetection(deps: React.DependencyList) {
  const hasPendingChangesState = useState(false);
  const setHasPendingChanges = hasPendingChangesState[1];
  const [prevDeps, setPrevDeps] = useState(deps);

  useEffect(() => {
    if (!deps.every((dep, i) => dep == prevDeps[i])) {
      setHasPendingChanges(true);
      setPrevDeps(deps);
    }
  }, deps);

  return hasPendingChangesState;
}
