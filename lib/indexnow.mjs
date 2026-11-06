/**
 * Public IndexNow key for Bing, Yandex, Seznam, and Naver.
 * IndexNow keys are public by design. This is not a secret.
 * Nothing here calls an IndexNow endpoint or submits a URL.
 */
export const INDEXNOW_KEY = "80eed0a6b524a05bdf7b07e287f6d12a";

if (!/^[0-9a-f]{32}$/.test(INDEXNOW_KEY)) {
  throw new Error("IndexNow key must be 32 lowercase hex characters.");
}

export const INDEXNOW_FILENAME = `${INDEXNOW_KEY}.txt`;
export const INDEXNOW_PATH = `/${INDEXNOW_FILENAME}`;
