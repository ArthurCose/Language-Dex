export function createSetFromMapped<V, K>(
  list: V[],
  map: (value: V) => K
): Set<K> {
  const set: Set<K> = new Set();

  addMappedToSet(set, list, map);

  return set;
}

export function addMappedToSet<V, K>(
  set: Set<K>,
  list: V[],
  map: (value: V) => K
): Set<K> {
  for (const value of list) {
    set.add(map(value));
  }

  return set;
}
