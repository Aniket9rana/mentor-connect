/** Wall-clock read for server pages. A named helper keeps `Date.now()` out of component bodies (react-hooks/purity). */
export const nowMs = () => Date.now();
