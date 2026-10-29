// Fail fast with a clear message if a required secret/config value is missing or
// malformed, rather than starting "successfully" and only breaking later when some
// request happens to hit the code path that needed it. Pure function (takes the env
// object instead of reading process.env directly) so it's unit-testable without
// booting the real server.
export const REQUIRED_ENV_VARS = [
    'ATLAS_URI', 'JWT_SECRET', 'GOOGLE_CLIENT_ID',
    'EMAIL_USER', 'EMAIL_APP_PASSWORD', 'FRONTEND_URL',
    'GOOGLE_VISION_API_KEY', 'GROQ_API_KEY',
    'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'
];

export const validateEnv = (env = process.env) => {
    const errors = [];

    const missing = REQUIRED_ENV_VARS.filter((key) => !env[key]);
    if (missing.length > 0) {
        errors.push(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // A short JWT_SECRET is brute-forceable — every token in the system (everyone's
    // login session) is only as strong as this one value. Only checked when present;
    // a missing JWT_SECRET is already reported above.
    if (env.JWT_SECRET && env.JWT_SECRET.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters long.');
    }

    return errors;
};
