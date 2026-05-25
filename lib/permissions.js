import secureStorage from "./secureStorage";

export const hasPermission = (code, user = null) => {
    if (typeof window === "undefined") return false;

    if (user?.role === "super_admin") return true;

    const isIpOwner = secureStorage.getItem("is_ip_owner", false);
    if (isIpOwner) return true;

    const perms = secureStorage.getItem("user_permissions", []);
    return perms.includes(code);
};

export const hasAnyPermission = (codes, user = null) => {
    return codes.some(code => hasPermission(code, user));
};

export const hasAllPermissions = (codes, user = null) => {
    return codes.every(code => hasPermission(code, user));
};

export const getUserPermissions = () => {
    if (typeof window === "undefined") return [];
    return secureStorage.getItem("user_permissions", []);
};

export const isIpOwner = () => {
    if (typeof window === "undefined") return false;
    return secureStorage.getItem("is_ip_owner", false);
};
