// Default to own-device inference using locally prepared, same-origin public assets.
// The previously configured Blob store returns 403 (store blocked). Keep hosted support
// available, but set a public base only after its runtime and weight GETs are verified.
export const MODEL_ASSET_BASE_URL = '';
