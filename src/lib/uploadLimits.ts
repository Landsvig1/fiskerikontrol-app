/**
 * The combined size cap for hand-uploaded PDFs, shared by the upload screen and the parse
 * route so the number the user is warned about and the number the server enforces are the
 * same one.
 *
 * The deployment platform rejects a request body larger than 4.5 MB before it reaches the
 * route, and it answers with a non-JSON body the client cannot read, which surfaced as a
 * bare "Ukendt fejl". Staying under that keeps the rejection ours, in Danish, and raised
 * before the upload rather than after it.
 *
 * Preset analysis is not bound by this: it posts document ids, and the route reads the
 * bundled corpus from disk.
 */
export const MAX_UPLOAD_MB = 4;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
