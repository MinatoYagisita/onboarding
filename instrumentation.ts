export async function register() {
  // Load secrets from AWS Secrets Manager before any route handler runs.
  // In local development, AWS_SECRET_NAME is unset so this is a no-op.
  // Catch connection errors (e.g. LocalStack not running) so the server still starts.
  try {
    const { loadSecrets } = await import("./lib/secrets");
    await loadSecrets();
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const msg = (err as Error)?.message ?? "";
    const isConnErr = code === "ECONNREFUSED" || code === "ENOTFOUND";
    const isNotFound = msg.includes("が見つかりません") || (err as { name?: string })?.name === "ResourceNotFoundException";
    if (isConnErr || isNotFound) {
      console.warn("[instrumentation] AWS Secrets Manager unavailable — falling back to env vars");
    } else {
      throw err;
    }
  }
}
