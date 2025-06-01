export const AUTH_MESSAGES = {
    // Success messages
    SUCCESS: {
        REGISTRATION_SUCCESS: 'Account registered successfully',
        LOGIN_SUCCESS: 'Login successful',
        LOGOUT_SUCCESS: 'Logout successful',
        PASSWORD_CHANGED: 'Password changed successfully',
        EMAIL_VERIFIED: 'Email verified successfully',
    },

    // Error messages
    ERROR: {
        ACCOUNT_NOT_FOUND: 'Account not found',
        INVALID_CREDENTIALS: 'Invalid email or password',
        EMAIL_ALREADY_EXISTS: 'Email already exists',
        USERNAME_ALREADY_EXISTS: 'Username already exists',
        INVALID_TOKEN: 'Invalid or expired token',
        UNAUTHORIZED: 'Unauthorized access',
        FORBIDDEN: 'Access forbidden',
        EMAIL_NOT_VERIFIED: 'Email not verified',
        WEAK_PASSWORD: 'Password does not meet security requirements',
        ACCOUNT_LOCKED: 'Account is temporarily locked',
        TOKEN_EXPIRED: 'Token has expired',
        REFRESH_TOKEN_INVALID: 'Invalid refresh token',
        ACCOUNT_REGISTRATION_FAILED: 'Account registration failed',
        LOGIN_FAILED: 'Login failed',
        ACCOUNT_SUSPENDED: 'Your account has been suspended',
    },

    // Validation messages
    VALIDATION: {
        EMAIL_REQUIRED: 'Email is required',
        EMAIL_INVALID: 'Please provide a valid email address',
        PASSWORD_REQUIRED: 'Password is required',
        PASSWORD_MIN_LENGTH: 'Password must be at least 8 characters long',
        PASSWORD_MAX_LENGTH: 'Password must not exceed 64 characters',
        PASSWORD_WEAK:
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        USERNAME_REQUIRED: 'Username is required',
        USERNAME_MIN_LENGTH: 'Username must be at least 3 characters long',
        CONFIRM_PASSWORD_REQUIRED: 'Password confirmation is required',
        PASSWORDS_DONT_MATCH: 'Passwords do not match',
    },
} as const;
