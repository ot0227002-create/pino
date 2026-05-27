/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cloudflare Pages は Node.js Image Optimization を提供しないため無効化
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  // next-on-pages: Server Actions 許可オリジン（Cloudflare Pages ドメイン）
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.pages.dev"],
    },
  },
};

export default nextConfig;
