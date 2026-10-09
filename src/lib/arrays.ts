export function shallowEqual(a: any[], b: any[]) {
  return a.length == b.length && a.every((v, i) => Object.is(v, b[i]));
}
