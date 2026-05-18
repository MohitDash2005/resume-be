const DEFAULT_CLIENT_ORIGINS = ["http://localhost:3000"];

const parseOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const getClientOrigins = () => {
  const configured = [
    ...parseOrigins(process.env.CLIENT_URL),
    ...parseOrigins(process.env.CLIENT_URLS),
  ];

  return configured.length > 0 ? configured : DEFAULT_CLIENT_ORIGINS;
};

const getPrimaryClientUrl = () => getClientOrigins()[0];

const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (getClientOrigins().includes(origin)) return callback(null, true);
  return callback(new Error(`CORS blocked origin: ${origin}`));
};

module.exports = { corsOrigin, getClientOrigins, getPrimaryClientUrl };
