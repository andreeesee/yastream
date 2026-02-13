export function envGet(name: string): string | undefined {
  return process.env[name];
}

export function envGetRequired(name: string): string {
  const value = envGet(name);
  if (!value) {
    throw new Error(`[ENV] Environment variable "${name}" is not configured.`);
  }

  return value;
}