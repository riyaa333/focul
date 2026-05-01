/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/', destination: '/landing-kinso-focul.html' },
    ]
  },
}

module.exports = nextConfig
