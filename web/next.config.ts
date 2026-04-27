import type { NextConfig } from "next";

/**
 * The build output `.next/server/` in this demo workspace gets evicted
 * by a background process within ~8 seconds of being written
 * (empirically reproducible — even a bare `mkdir .next/server &&
 * touch file` disappears). Allow callers to route around it by
 * pointing distDir to a stable location outside the watched tree.
 *
 * Setting NEXT_DIST_DIR=/tmp/mizan-next (or similar) on the demo Mac
 * keeps the build intact across `next start`. The packaged installer
 * (mac-build.sh) doesn't set this — default `.next` is fine on a
 * clean customer machine.
 */
const nextConfig: NextConfig = {
  ...(process.env.NEXT_DIST_DIR
    ? { distDir: process.env.NEXT_DIST_DIR }
    : {}),
};

export default nextConfig;
