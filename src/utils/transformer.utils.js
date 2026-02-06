/**
 * Data transformation utilities
 * Centralized transformers for converting database records to API response format
 * Converts snake_case fields to camelCase and structures nested data
 */

/**
 * Generic field mapping transformer
 * @param {Object} obj - Source object
 * @param {Object} fieldMap - Mapping of source field to target field
 * @returns {Object|null}
 */
export const mapFields = (obj, fieldMap) => {
  if (!obj) return null;
  const result = {};
  for (const [sourceKey, targetKey] of Object.entries(fieldMap)) {
    if (obj[sourceKey] !== undefined) {
      result[targetKey] = obj[sourceKey];
    }
  }
  return result;
};

/**
 * User transformer
 * Transforms user data from database format to API response format
 */
export const userTransformer = {
  /**
   * Transform user from DB format
   * @param {Object} user - User object from database
   * @returns {Object|null}
   */
  fromDB: (user) => {
    if (!user) return null;
    return {
      userId: user.user_id,
      username: user.username,
      nickname: user.nickname,
    };
  },

  /**
   * Transform user profile from DB format
   * @param {Object} user - User object with profile data
   * @returns {Object|null}
   */
  profileFromDB: (user) => {
    if (!user) return null;
    return {
      userId: user.user_id,
      username: user.username,
      nickname: user.nickname,
      createdAt: user.created_at,
    };
  },
};

/**
 * Post transformer
 * Transforms post data from database format to API response format
 */
export const postTransformer = {
  /**
   * Transform basic post from DB format
   * @param {Object} post - Post object from database
   * @returns {Object|null}
   */
  fromDB: (post) => {
    if (!post) return null;
    return {
      postId: post.post_id,
      userId: post.user_id,
      contents: post.contents,
      createdAt: post.created_at,
      longitude: post.longitude,
      latitude: post.latitude,
    };
  },

  /**
   * Transform post with user and media from DB format
   * @param {Object} post - Post object with relations
   * @returns {Object|null}
   */
  withRelationsFromDB: (post) => {
    if (!post) return null;
    return {
      postId: post.post_id,
      contents: post.contents,
      createdAt: post.created_at,
      longitude: post.longitude,
      latitude: post.latitude,
      user: post.users_account ? userTransformer.fromDB(post.users_account) : null,
      media: post.media_storage?.map(mediaTransformer.fromDB) || [],
    };
  },

  /**
   * Transform post list item (for lists with counts)
   * @param {Object} post - Post object with counts
   * @returns {Object|null}
   */
  listItemFromDB: (post) => {
    if (!post) return null;
    return {
      postId: post.postId || post.post_id,
      userId: post.userId || post.user_id,
      nickname: post.nickname,
      contents: post.contents,
      createdAt: post.createdAt || post.created_at,
      distance: post.distance,
      likeCount: post.likeCount ?? 0,
      commentCount: post.commentCount ?? 0,
      media: post.media || [],
    };
  },
};

/**
 * Media transformer
 * Transforms media data from database format to API response format
 */
export const mediaTransformer = {
  /**
   * Transform media from DB format
   * @param {Object} media - Media object from database
   * @returns {Object|null}
   */
  fromDB: (media) => {
    if (!media) return null;
    return {
      mediaId: media.media_id,
      link: media.link,
      type: media.type,
      createdAt: media.created_at,
    };
  },
};

/**
 * Comment transformer
 * Transforms comment data from database format to API response format
 */
export const commentTransformer = {
  /**
   * Transform comment from DB format
   * @param {Object} comment - Comment object from database
   * @returns {Object|null}
   */
  fromDB: (comment) => {
    if (!comment) return null;
    return {
      commentId: comment.commentId,
      postId: comment.postId,
      userId: comment.userId,
      parentId: comment.parentId,
      contents: comment.contents,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: comment.user ? userTransformer.fromDB(comment.user) : null,
      replies: comment.replies?.map(commentTransformer.fromDB) || [],
    };
  },

  /**
   * Transform comment with post info
   * @param {Object} comment - Comment with post relation
   * @returns {Object|null}
   */
  withPostFromDB: (comment) => {
    if (!comment) return null;
    return {
      ...commentTransformer.fromDB(comment),
      post: comment.post
        ? {
            postId: comment.post.post_id,
            contents: comment.post.contents,
          }
        : null,
    };
  },
};

/**
 * Notification transformer
 * Transforms notification data from database format to API response format
 */
export const notificationTransformer = {
  /**
   * Transform notification from DB format
   * @param {Object} notification - Notification object from database
   * @returns {Object|null}
   */
  fromDB: (notification) => {
    if (!notification) return null;
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data ? JSON.parse(notification.data) : null,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
    };
  },
};

/**
 * Prisma select objects for common queries
 * Reusable select configurations to ensure consistency
 */
export const selectFields = {
  user: {
    user_id: true,
    username: true,
    nickname: true,
  },
  userProfile: {
    user_id: true,
    username: true,
    nickname: true,
    created_at: true,
  },
  postBasic: {
    post_id: true,
    user_id: true,
    contents: true,
    created_at: true,
    longitude: true,
    latitude: true,
  },
  media: {
    media_id: true,
    link: true,
    type: true,
    created_at: true,
  },
};

export default {
  mapFields,
  userTransformer,
  postTransformer,
  mediaTransformer,
  commentTransformer,
  notificationTransformer,
  selectFields,
};
