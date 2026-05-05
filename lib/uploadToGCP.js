import apiClient from "./apiClient";

/**
 * Upload an image file to GCP Storage via backend API
 * @param {File} file - The image file to upload
 * @param {string} folder - Optional subfolder within the project folder (e.g., 'logos', 'editions')
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadImageToGCP = async (file, folder = "") => {
    try {
        console.log("🔧 uploadImageToGCP called with:", {
            fileName: file?.name,
            fileSize: file?.size,
            folder: folder,
            uploadEndpoint: process.env.NEXT_PUBLIC_UPLOAD_ENDPOINT
        });

        if (!file) {
            console.error("❌ No file provided");
            return { success: false, error: "No file provided" };
        }

        // Validate file type
        const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
        if (!validTypes.includes(file.type)) {
            console.error("❌ Invalid file type:", file.type);
            return { success: false, error: "Invalid file type. Only images are allowed." };
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            console.error("❌ File too large:", file.size);
            return { success: false, error: "File size exceeds 5MB limit." };
        }

        // Create FormData
        const formData = new FormData();
        formData.append("file", file);
        if (folder) {
            formData.append("folder", folder);
        }

        console.log("📤 Sending upload request to:", process.env.NEXT_PUBLIC_UPLOAD_ENDPOINT);
        console.log("📦 FormData contents:", {
            file: file.name,
            folder: folder
        });

        // Upload to backend API which will handle GCP upload
        const result = await apiClient.upload(
            process.env.NEXT_PUBLIC_UPLOAD_ENDPOINT,
            formData
        );

        console.log("📥 Backend response:", result);

        if (result.success) {
            // Backend should return the GCP URL
            const gcpUrl = result.data?.url || result.data?.gcp_url || result.url;
            console.log("✅ Upload successful! GCP URL:", gcpUrl);
            return { success: true, url: gcpUrl };
        } else {
            console.error("❌ Backend returned error:", result.error);
            return { success: false, error: result.error || "Upload failed" };
        }
    } catch (error) {
        console.error("❌ Exception in uploadImageToGCP:", error);
        return { success: false, error: error.message || "Upload failed" };
    }
};

/**
 * Get the full GCP URL for an image
 * @param {string} path - The path/filename in GCP storage
 * @returns {string} - Full GCP URL
 */
export const getGCPImageUrl = (path) => {
    if (!path) return "";

    // If already a full URL, return as is
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    // Construct full GCP URL
    const baseUrl = process.env.NEXT_PUBLIC_GCP_BASE_URL;
    const folder = process.env.NEXT_PUBLIC_GCP_PROJECT_FOLDER;

    return `${baseUrl}/${folder}/${path}`;
};
