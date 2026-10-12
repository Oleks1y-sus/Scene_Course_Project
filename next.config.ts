import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    unoptimized: true,
  },
  basePath: '/scene_Course_Project',
};

export default nextConfig;
