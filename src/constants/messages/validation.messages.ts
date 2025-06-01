export const VALIDATION_MESSAGES = {
    // General validation
    REQUIRED_FIELD: (fieldName: string) => `This ${fieldName} field is required`,
    INVALID_FORMAT: 'Invalid format provided',
    FIELD_TOO_SHORT: 'Field is too short',
    FIELD_TOO_LONG: 'Field is too long',

    // Data type validation
    INVALID_EMAIL: 'Please provide a valid email address',
    INVALID_PHONE: 'Please provide a valid phone number',
    INVALID_URL: 'Please provide a valid URL',
    INVALID_UUID: 'Please provide a valid UUID',
    INVALID_DATE: 'Please provide a valid date',

    // Numeric validation
    MUST_BE_NUMBER: 'Value must be a number',
    MUST_BE_POSITIVE: 'Value must be positive',
    MUST_BE_INTEGER: 'Value must be an integer',
    OUT_OF_RANGE: 'Value is out of acceptable range',

    // String validation
    MIN_LENGTH: (min: number) => `Minimum length is ${min} characters`,
    MAX_LENGTH: (max: number) => `Maximum length is ${max} characters`,
    CONTAINS_INVALID_CHARS: 'Contains invalid characters',
    MUST_BE_STRING: (fieldName: string) => `${fieldName} must be a string`,

    // Array validation
    ARRAY_EMPTY: 'Array cannot be empty',
    ARRAY_TOO_LARGE: 'Array has too many items',
    INVALID_ARRAY_ITEM: 'Array contains invalid item',

    // File validation
    FILE_REQUIRED: 'File is required',
    INVALID_FILE_TYPE: 'Invalid file type',
    FILE_TOO_LARGE: 'File size exceeds limit',
    FILE_TOO_SMALL: 'File size is too small',
} as const;
