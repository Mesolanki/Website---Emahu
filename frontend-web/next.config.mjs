/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
    const defaultApi = isProd ? 'https://website-emahu.onrender.com' : 'http://127.0.0.1:5000';
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || defaultApi)
      .replace(/\/api\/auth$/, '')
      .replace(/\/api$/, '')
      .replace(/\/$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiBase}/uploads/:path*`,
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'website-emahu.onrender.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'http',  hostname: '127.0.0.1' },
      { protocol: 'http',  hostname: 'localhost' },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 3600,
  },

  compress: true,

  experimental: {
    optimizeCss: false,
  },
};

export default nextConfig;
