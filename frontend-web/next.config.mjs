/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000')
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
