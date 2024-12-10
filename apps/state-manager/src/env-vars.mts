export const envVars = {
    /**
     * Database connection string. Must point to the application database and contain its owner credentials
     */
    CCS3_STATE_MANAGER_STORAGE_CONNECTION_STRING: 'CCS3_STATE_MANAGER_STORAGE_CONNECTION_STRING',
    /**
     * Reserved for future use. Database connection with admin credentials. Can be used in the future to create the application database and its user automatically
     */
    CCS3_STATE_MANAGER_STORAGE_ADMIN_CONNECTION_STRING: 'CCS3_STATE_MANAGER_STORAGE_ADMIN_CONNECTION_STRING',
    /**
     * The path to the directory that contains database migration scripts used to update the database schema if needed.
     */
    CCS3_STATE_MANAGER_STORAGE_PROVIDER_DATABASE_MIGRATION_SCRIPTS_DIRECTORY: 'CCS3_STATE_MANAGER_STORAGE_PROVIDER_DATABASE_MIGRATION_SCRIPTS_DIRECTORY',
};
