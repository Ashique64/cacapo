import { withBotId } from "botid/next/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,

  images: {
    // Allow next/image to optimize images from Supabase storage
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lnmmifltzhanjkfxmeuw.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Cache optimized images for 31 days (vs 4h default) to reduce Vercel transformations & cache writes
    minimumCacheTTL: 2678400,
    // Serve WebP only (halves transformations compared to WebP + AVIF)
    formats: ["image/webp"],
    // Lock allowed quality to 75
    qualities: [75],
    // Trimmed breakpoints to reduce per-image transformation variants
    deviceSizes: [640, 1024, 1536],
    imageSizes: [160, 384],
  },
};

export default withBotId(nextConfig);
