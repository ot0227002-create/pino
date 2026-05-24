/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Cloudflare Pages は Next.js Image Optimization API を提供しないため無効化
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
