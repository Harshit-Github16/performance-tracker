/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_BASE_URL: "https://4w5mn9pl-3000.inc1.devtunnels.ms",

    // Auth
    NEXT_PUBLIC_LOGIN_ENDPOINT: "/auth/login",
    NEXT_PUBLIC_FORGOT_PASSWORD_ENDPOINT: "/auth/forgot-password",
    NEXT_PUBLIC_RESET_PASSWORD_ENDPOINT: "/auth/reset-password",

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
    NEXT_PUBLIC_MATCHES_ENDPOINT: "/matches",
    NEXT_PUBLIC_PERSONS_ENDPOINT: "/persons",
    NEXT_PUBLIC_SPONSORSHIPS_ENDPOINT: "/sponsorships",

    // Metrics
    NEXT_PUBLIC_METRIC_CATEGORIES_ENDPOINT: "/metric-categories",
    NEXT_PUBLIC_METRIC_DEFINITIONS_ENDPOINT: "/metric-definitions",
    NEXT_PUBLIC_METRIC_VALUES_ENDPOINT: "/metric-values",

    // Change Requests (Approvals)
    NEXT_PUBLIC_CHANGE_REQUESTS_ENDPOINT: "/change-requests",

    // GCP Storage Configuration
    NEXT_PUBLIC_GCP_PROJECT_ID: "yuva-kabaddi-series-prod",
    NEXT_PUBLIC_GCP_BUCKET_NAME: "elev8-apps",
    NEXT_PUBLIC_GCP_PROJECT_FOLDER: "performance-tracker",
    NEXT_PUBLIC_GCP_BASE_URL: "https://storage.googleapis.com/elev8-apps",
    NEXT_PUBLIC_UPLOAD_ENDPOINT: "/upload",
  },
};

export default nextConfig;


