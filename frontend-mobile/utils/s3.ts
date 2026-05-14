const S3_BUCKET_NAME = "wisdom-social-db";
const S3_REGION = "ap-southeast-1";

export function buildS3Url(url?: string | null): string | undefined {
    const value = url?.trim();
    if (!value) return undefined;

    if (
        /^https?:\/\//i.test(value) ||
        /^data:/i.test(value) ||
        /^blob:/i.test(value) ||
        value.startsWith("file://") ||
        value.startsWith("content://")
    ) {
        return value;
    }

    const normalizedKey = value.replace(/^\/+/, "");
    return `https://${S3_BUCKET_NAME}.s3.${S3_REGION}.amazonaws.com/${normalizedKey}`;
}
