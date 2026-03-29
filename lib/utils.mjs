export function slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function getContentType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const map = {
        html:'text/html', htm:'text/html', css:'text/css', js:'application/javascript',
        mjs:'application/javascript', json:'application/json', png:'image/png',
        jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', svg:'image/svg+xml',
        ico:'image/x-icon', webp:'image/webp', woff:'font/woff', woff2:'font/woff2',
        ttf:'font/ttf', otf:'font/otf', txt:'text/plain', xml:'application/xml',
        pdf:'application/pdf', mp4:'video/mp4', webm:'video/webm', mp3:'audio/mpeg',
        md:'text/markdown', map:'application/json', avif:'image/avif',
    };
    return map[ext] || 'application/octet-stream';
}
