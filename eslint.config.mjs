import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * `next lint` was removed in Next 16, so `npm run lint` printed the CLI's usage
 * text and exited — which CI dutifully ignored, because the step is advisory.
 * ESLint is run directly now, and it needs a flat config to find these rules.
 */
const config = [
  ...coreWebVitals,
  ...typescript,
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
];

export default config;
