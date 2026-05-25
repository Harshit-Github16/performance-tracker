import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'elev8-default-key-change-this-in-production';

const encrypt = (data) => {
    try {
        const jsonString = JSON.stringify(data);
        const encrypted = CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
        return encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
};

const decrypt = (encryptedData) => {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
        const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decryptedString);
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
};

export const setSecureItem = (key, value) => {
    if (typeof window === 'undefined') return false;

    try {
        const encryptedValue = encrypt(value);
        localStorage.setItem(key, encryptedValue);
        return true;
    } catch (error) {
        console.error(`Failed to set secure item ${key}:`, error);
        return false;
    }
};

export const getSecureItem = (key, defaultValue = null) => {
    if (typeof window === 'undefined') return defaultValue;

    try {
        const encryptedValue = localStorage.getItem(key);
        if (!encryptedValue) return defaultValue;

        const decryptedValue = decrypt(encryptedValue);
        return decryptedValue !== null ? decryptedValue : defaultValue;
    } catch (error) {
        console.error(`Failed to get secure item ${key}:`, error);
        return defaultValue;
    }
};

export const removeSecureItem = (key) => {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error(`Failed to remove secure item ${key}:`, error);
    }
};

export const clearSecureStorage = () => {
    if (typeof window === 'undefined') return;

    try {
        localStorage.clear();
    } catch (error) {
        console.error('Failed to clear secure storage:', error);
    }
};

export const hasSecureItem = (key) => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(key) !== null;
};

export default {
    setItem: setSecureItem,
    getItem: getSecureItem,
    removeItem: removeSecureItem,
    clear: clearSecureStorage,
    hasItem: hasSecureItem,
};
