// Common regex patterns
export const REGEX_PATTERNS = {
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,64}$/,
    PHONE: /^\+?[1-9]\d{1,14}$/,
    USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
} as const;
