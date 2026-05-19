/**
 * Permission utility functions
 * Centralized permission checking for the application
 */

/**
 * Check if user has a specific permission
 * @param {string} code - Permission code (e.g., "users:view", "editions:add")
 * @param {object} user - User object from AuthContext
 * @returns {boolean}
 */
export const hasPermission = (code, user = null) => {
    if (typeof window === "undefined") return false;

    // Super admin has all permissions
    if (user?.role === "super_admin") return true;

    // Check if user is IP Owner (has all permissions)
    const isIpOwner = JSON.parse(localStorage.getItem("is_ip_owner") || "false");
    if (isIpOwner) return true;

    // Check user permissions from localStorage
    const perms = JSON.parse(localStorage.getItem("user_permissions") || "[]");
    return perms.includes(code);
};

/**
 * Check multiple permissions (OR logic - user needs at least one)
 * @param {string[]} codes - Array of permission codes
 * @param {object} user - User object from AuthContext
 * @returns {boolean}
 */
export const hasAnyPermission = (codes, user = null) => {
    return codes.some(code => hasPermission(code, user));
};

/**
 * Check multiple permissions (AND logic - user needs all)
 * @param {string[]} codes - Array of permission codes
 * @param {object} user - User object from AuthContext
 * @returns {boolean}
 */
export const hasAllPermissions = (codes, user = null) => {
    return codes.every(code => hasPermission(code, user));
};

/**
 * Get all user permissions
 * @returns {string[]}
 */
export const getUserPermissions = () => {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem("user_permissions") || "[]");
};

/**
 * Check if user is IP Owner
 * @returns {boolean}
 */
export const isIpOwner = () => {
    if (typeof window === "undefined") return false;
    return JSON.parse(localStorage.getItem("is_ip_owner") || "false");
};
