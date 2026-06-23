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
    // Prefer WebP, with AVIF as the best-quality fallback
    formats: ["image/webp", "image/avif"],
    // Reasonable device widths for responsive images
    deviceSizes: [375, 640, 768, 1024, 1280, 1920],
    imageSizes: [80, 160, 320, 480],
  },
};

export default nextConfig;
