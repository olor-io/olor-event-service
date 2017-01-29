var CONST = {

    USER_ROLE_GROUPS: {
        ALL: ['admin', 'moderator', 'service'],
        ABOVE_MODERATOR: ['admin', 'moderator']
    },

    // User roles describe the different roles of API users
    USER_ROLES: {
        // Can access anything, even system internals
        ADMIN: 'admin',
        // Can access anything but system internals and user management
        MODERATOR: 'moderator',
        // Can only access ratings and basic models
        SERVICE: 'service'
    },

    // Author roles describe the different roles of commenters in a discussion
    AUTHOR_ROLES: {
        // Moderator of the discussion
        MODERATOR: 'moderator',
        // User who has registered to Kesko's systems
        REGISTERED: 'registered',
        // Guest user
        ANONYMOUS: 'anonymous'
    },

    USER_MIN_AGE: 16,

    USER_MAX_AGE: 100,

    PASSWORD_HASH_SALT_LENGTH: 10,

    SESSION_COOKIE_MAX_AGE: 60 * 60 * 24 * 7,  // 1 week

    GLOBAL_SETTINGS_KEY: 'global'
};

module.exports = CONST;
