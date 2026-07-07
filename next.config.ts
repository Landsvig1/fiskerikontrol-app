import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // pdf-parse re-exports pdfjs-dist internals in a shape Next.js's bundler mistranspiles
  // (throws "Object.defineProperty called on non-object" on `import("pdf-parse")`).
  // Excluding it from bundling makes the route use Node's native module loader instead.
  serverExternalPackages: ["pdf-parse"],
  // pdfjs-dist always runs in "fake worker" mode under Node and loads its worker
  // script via a dynamic `import(this.workerSrc)` with a computed path. Next's
  // file tracing can't follow that, so the file gets pruned from the deployed
  // function unless explicitly included here.
  outputFileTracingIncludes: {
    "/api/parse": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
};

export default nextConfig;
