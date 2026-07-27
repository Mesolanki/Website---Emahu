/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const defaultApi = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    const apiBase = defaultApi
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
        destination: 'http://127.0.0.1:5000/uploads/:path*',
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'website-emahu.onrender.com' },
      { protocol: 'https', hostname: 'firebasestorage.googleapis.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'emahu.com', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'www.emahu.com', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'manage.emahu.com', pathname: '/uploads/**' },
      { protocol: 'http', hostname: '127.0.0.1', port: '5000', pathname: '/uploads/**' },
      { protocol: 'http', hostname: 'localhost', port: '5000', pathname: '/uploads/**' },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 3600,
  },

  compress: true,
};

export default nextConfig;
