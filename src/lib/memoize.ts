/** memoize a simple function with one param */
export function memoizeUnary<P extends string | number | symbol, R>(
  fn: (arg: P) => R,
): (arg: P) => R {
  const cache: { [key: string | number | symbol]: R } = {};

  return (p) => {
    let result = cache[p];

    if (result != null) {
      return result;
    }

    result = fn(p);
    cache[p] = result;
    return result;
  };
}
