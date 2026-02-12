function envGet(name) {
  return process.env[name];
}

function envGetRequired(name) {
  const value = envGet(name);
  if (!value) {
    throw new Error(`Environment variable "${name}" is not configured.`);
  }

  return value;
}

module.exports = { envGet, envGetRequired };
