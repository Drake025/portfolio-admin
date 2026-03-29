/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: { bodySizeLimit: '50mb' },
    },
    serverExternalPackages: ['adm-zip'],
};
module.exports = nextConfig;
