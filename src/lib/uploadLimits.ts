/**
 * The combined size cap for hand-uploaded documents (PDF and HTML), shared by the upload screen
 * and the parse route so the number the user is warned about and the number the server
 * enforces are the same one.
 *
 * Preset analysis is not bound by this: it posts document ids, and the route reads the
 * bundled corpus from disk.
 */
export const MAX_UPLOAD_MB = 50;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

