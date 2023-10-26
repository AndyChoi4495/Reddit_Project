/** @type {import('next').NextConfig} */

const nextConfig = {
    reactStrictMode: true,
    images: {
        domains: ['www.gravatar.com', 'localhost', 'ec2-18-117-131-28.us-east-2.compute.amazonaws.com'],
    },
};

module.exports = nextConfig;
