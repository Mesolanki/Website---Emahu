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
    ];
  },
};

export default nextConfig;
