import apiClient from "./apiClient";

export const uploadImageToGCP = async (file, folder = "") => {
    try {
        if (!file) {
            return { success: false, error: "No file provided" };
        }

        const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
        if (!validTypes.includes(file.type)) {
            return { success: false, error: "Invalid file type. Only images are allowed." };
        }

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return { success: false, error: "File size exceeds 5MB limit." };
        }

        const formData = new FormData();
        formData.append("file", file);
        if (folder) {
            formData.append("folder", folder);
        }

        const result = await apiClient.upload(process.env.NEXT_PUBLIC_UPLOAD_ENDPOINT, formData);

        if (result.success) {
            const gcpUrl = result.data?.url || result.data?.gcp_url || result.url;
            return { success: true, url: gcpUrl };
        } else {
            return { success: false, error: result.error || "Upload failed" };
        }
    } catch (error) {
        return { success: false, error: error.message || "Upload failed" };
    }
};

export const getGCPImageUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }
    const baseUrl = process.env.NEXT_PUBLIC_GCP_BASE_URL;
    const folder = process.env.NEXT_PUBLIC_GCP_PROJECT_FOLDER;
    return `${baseUrl}/${folder}/${path}`;
};
