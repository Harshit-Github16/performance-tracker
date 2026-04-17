/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_BASE_URL: "https://4w5mn9pl-3000.inc1.devtunnels.ms",

    // Auth
    NEXT_PUBLIC_LOGIN_ENDPOINT: "/auth/login",

    // Properties (IPs)
    NEXT_PUBLIC_PROPERTIES_ENDPOINT: "/properties",
    NEXT_PUBLIC_MY_PROPERTIES_ENDPOINT: "/properties/my-properties",

    // Users
    NEXT_PUBLIC_USERS_ENDPOINT: "/users",

    // Roles
    NEXT_PUBLIC_ROLES_ENDPOINT: "/roles",

    // Editions
    NEXT_PUBLIC_EDITIONS_ENDPOINT: "/editions",

    // Sports
    NEXT_PUBLIC_SPORTS_ENDPOINT: "/sports",
    NEXT_PUBLIC_TEAMS_ENDPOINT: "/teams",
    NEXT_PUBLIC_MATCHES_ENDPOINT: "/matches"

  },
};

export default nextConfig;
