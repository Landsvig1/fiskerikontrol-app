import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // pdf-parse re-exports pdfjs-dist internals in a shape Next.js's bundler mistranspiles
  // (throws "Object.defineProperty called on non-object" on `import("pdf-parse")`).
  // Excluding it from bundling makes the route use Node's native module loader instead.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
