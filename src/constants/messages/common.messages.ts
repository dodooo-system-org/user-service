export const COMMON_MESSAGES = {
    // Generic success messages
    SUCCESS: {
        OPERATION_COMPLETED: 'Operation completed successfully',
        DATA_SAVED: 'Data saved successfully',
        DATA_UPDATED: 'Data updated successfully',
        DATA_DELETED: 'Data deleted successfully',
        DATA_RETRIEVED: 'Data retrieved successfully',
    },

    // Generic error messages
    ERROR: {
        INTERNAL_SERVER_ERROR: 'Internal server error occurred',
        SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
        BAD_REQUEST: 'Bad request',
        NOT_FOUND: 'Resource not found',
        CONFLICT: 'Resource conflict',
        UNPROCESSABLE_ENTITY: 'Unprocessable entity',
        TOO_MANY_REQUESTS: 'Too many requests, please try again later',
        NETWORK_ERROR: 'Network error occurred',
        TIMEOUT_ERROR: 'Request timeout',
        DATABASE_ERROR: 'Database operation failed',
        EXTERNAL_SERVICE_ERROR: 'External service error',
        UNAUTHORIZED: 'Unauthorized access',
    },

    // Confirmation messages
    CONFIRMATION: {
        DELETE_ITEM: 'Are you sure you want to delete this item?',
        DELETE_MULTIPLE: 'Are you sure you want to delete selected items?',
        UNSAVED_CHANGES: 'You have unsaved changes. Do you want to continue?',
        LOGOUT: 'Are you sure you want to logout?',
        RESET_DATA: 'This will reset all data. Are you sure?',
    },

    // Pagination messages
    PAGINATION: {
        NO_DATA: 'No data available',
        NO_MORE_DATA: 'No more data to load',
        LOADING_MORE: 'Loading more...',
        PAGE_NOT_FOUND: 'Page not found',
        FIRST_PAGE: 'This is the first page',
        LAST_PAGE: 'This is the last page',
    },
} as const;
