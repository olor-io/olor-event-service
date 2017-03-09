var CONST = {
    // If these change, redis must be flushed
    REDIS_PREFIX: {
        RATING_SUMMARIES: 'rating-summaries'
    },
    DEFAULT_ITEM_LIMIT: 10,

    HEADER_TOTAL_COUNT: 'x-total-count',

    // It was a compromise to store the roles as constants instead of inside
    // the database

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

    PASSWORD_HASH_SALT_LENGTH: 10,

    SESSION_COOKIE_MAX_AGE: 60 * 60 * 24 * 7,  // 1 week

    GLOBAL_SETTINGS_KEY: 'global'
};

module.exports = CONST;
