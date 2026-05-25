import secureStorage from "./secureStorage";

export const getLocalStorage = (key, defaultValue = null) => {
    if (typeof window === "undefined") return defaultValue;

    try {
        return secureStorage.getItem(key, defaultValue);
    } catch (error) {
        console.error(`Error parsing localStorage key "${key}":`, error);
        return defaultValue;
    }
};

export const setLocalStorage = (key, value) => {
    if (typeof window === "undefined") return false;

    try {
        secureStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
        return false;
    }
};

export const formatDate = (dateString, options = {}) => {
    if (!dateString) return "—";

    const defaultOptions = {
        day: "2-digit",
        month: "short",
        year: "numeric",
        ...options
    };

    try {
        return new Date(dateString).toLocaleDateString("en-IN", defaultOptions);
    } catch (error) {
        console.error("Error formatting date:", error);
        return "—";
    }
};

export const formatDateTime = (dateString) => {
    return formatDate(dateString, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
};

export const debounce = (func, wait = 300) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export const throttle = (func, limit = 300) => {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};

export const getInitials = (name, maxLength = 3) => {
    if (!name) return "";

    return name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, maxLength);
};

export const formatCurrency = (amount, currency = "INR") => {
    if (amount === null || amount === undefined) return "—";

    try {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency,
            maximumFractionDigits: 0
        }).format(amount);
    } catch (error) {
        return `₹${amount.toLocaleString()}`;
    }
};

export const truncate = (text, maxLength = 50) => {
    if (!text || text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
};

export const hasPermission = (permission, isIpOwner = false) => {
    if (isIpOwner) return true;

    const permissions = getLocalStorage("user_permissions", []);
    return permissions.includes(permission);
};

export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const randomColor = () => {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
};

export const deepClone = (obj) => {
    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (error) {
        console.error("Error cloning object:", error);
        return obj;
    }
};

export const isEmpty = (obj) => {
    return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
};

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
