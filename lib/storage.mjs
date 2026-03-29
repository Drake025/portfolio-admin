// Storage abstraction: supports Vercel Blob or AWS S3
// Set STORAGE_PROVIDER=blob or STORAGE_PROVIDER=s3 in .env

const PROVIDER = process.env.STORAGE_PROVIDER || 'blob';
const PREFIX = 'portfolio/';

// ── Vercel Blob ──────────────────────────────────────────────
async function blobUpload(path, data, contentType) {
    const { put } = await import('@vercel/blob');
    const r = await put(PREFIX + path, data, { access: 'public', contentType, allowOverwrite: true });
    return r.url;
}
async function blobList(prefix) {
    const { list } = await import('@vercel/blob');
    const r = await list({ prefix: PREFIX + prefix, limit: 1000 });
    return r.blobs.map(b => ({ url: b.url, key: b.pathname.replace(PREFIX, ''), size: b.size }));
}
async function blobDelete(urls) {
    const { del } = await import('@vercel/blob');
    await del(urls);
}
async function blobDeletePrefix(prefix) {
    const files = await blobList(prefix);
    if (files.length) await blobDelete(files.map(f => f.url));
    return files.length;
}

// ── AWS S3 ───────────────────────────────────────────────────
let _s3;
async function getS3() {
    if (_s3) return _s3;
    const { S3Client } = await import('@aws-sdk/client-s3');
    _s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    return _s3;
}
function s3Url(key) {
    const cdn = process.env.CLOUDFRONT_DOMAIN;
    if (cdn) return `https://${cdn}/${key}`;
    return `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`;
}
async function s3Upload(path, data, contentType) {
    const s3 = await getS3();
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const key = PREFIX + path;
    const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
    await s3.send(new PutObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
    return s3Url(key);
}
async function s3List(prefix) {
    const s3 = await getS3();
    const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const r = await s3.send(new ListObjectsV2Command({ Bucket: process.env.AWS_S3_BUCKET, Prefix: PREFIX + prefix }));
    return (r.Contents || []).map(o => ({ url: s3Url(o.Key), key: o.Key.replace(PREFIX, ''), size: o.Size }));
}
async function s3DeletePrefix(prefix) {
    const s3 = await getS3();
    const { DeleteObjectsCommand, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const listed = await s3.send(new ListObjectsV2Command({ Bucket: process.env.AWS_S3_BUCKET, Prefix: PREFIX + prefix }));
    if (!listed.Contents?.length) return 0;
    await s3.send(new DeleteObjectsCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Delete: { Objects: listed.Contents.map(o => ({ Key: o.Key })) },
    }));
    return listed.Contents.length;
}

// ── Unified API ──────────────────────────────────────────────
export async function uploadFile(path, data, contentType = 'application/octet-stream') {
    return PROVIDER === 's3' ? s3Upload(path, data, contentType) : blobUpload(path, data, contentType);
}
export async function listFiles(prefix) {
    return PROVIDER === 's3' ? s3List(prefix) : blobList(prefix);
}
export async function deletePrefix(prefix) {
    return PROVIDER === 's3' ? s3DeletePrefix(prefix) : blobDeletePrefix(prefix);
}
export function getProvider() { return PROVIDER; }
