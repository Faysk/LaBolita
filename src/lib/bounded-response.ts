export async function readTextWithByteLimit(response: Response, maxBytes: number) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
    throw new Error("Response byte limit must be a positive safe integer.");
  }

  const declaredLength = response.headers.get("content-length");
  if (declaredLength && /^\d+$/.test(declaredLength)) {
    const declaredBytes = Number(declaredLength);
    if (declaredBytes > maxBytes) {
      throw limitError(maxBytes);
    }
  }

  if (!response.body) return "";

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let body = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    bytesRead += value.byteLength;
    if (bytesRead > maxBytes) {
      await reader.cancel();
      throw limitError(maxBytes);
    }

    body += decoder.decode(value, { stream: true });
  }

  return body + decoder.decode();
}

function limitError(maxBytes: number) {
  return new Error(`Response exceeded ${maxBytes} bytes.`);
}
