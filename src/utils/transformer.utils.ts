// transformer.utils.ts
// Data transformation utilities

export const mapFields = (
  obj: Record<string, unknown> | null,
  fieldMap: Record<string, string>,
): Record<string, unknown> | null => {
  if (!obj) return null;
  const result: Record<string, unknown> = {};
  for (const [sourceKey, targetKey] of Object.entries(fieldMap)) {
    if (obj[sourceKey] !== undefined) {
      result[targetKey] = obj[sourceKey];
    }
  }
  return result;
};

export const userTransformer = {
  fromDB: (user: Record<string, unknown> | null) => {
    if (!user) return null;
    return {
      userId: user.user_id,
      nickname: user.nickname,
    };
  },

  profileFromDB: (user: Record<string, unknown> | null) => {
    if (!user) return null;
    return {
      userId: user.user_id,
      nickname: user.nickname,
      createdAt: user.created_at,
    };
  },
};

export const postTransformer = {
  fromDB: (post: Record<string, unknown> | null) => {
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

  withRelationsFromDB: (post: Record<string, unknown> | null) => {
    if (!post) return null;
    return {
      postId: post.post_id,
      contents: post.contents,
      createdAt: post.created_at,
      longitude: post.longitude,
      latitude: post.latitude,
      user: post.users_account
        ? userTransformer.fromDB(post.users_account as Record<string, unknown>)
        : null,
      media: ((post.media_storage as Record<string, unknown>[]) || []).map(mediaTransformer.fromDB),
    };
  },

  listItemFromDB: (post: Record<string, unknown> | null) => {
    if (!post) return null;
    return {
      postId: post.postId || post.post_id,
      userId: post.userId || post.user_id,
      nickname: post.nickname,
      contents: post.contents,
      createdAt: post.createdAt || post.created_at,
      distance: post.distance,
      likeCount: (post.likeCount as number) ?? 0,
      commentCount: (post.commentCount as number) ?? 0,
      media: post.media || [],
    };
  },
};

export const mediaTransformer = {
  fromDB: (media: Record<string, unknown> | null) => {
    if (!media) return null;
    return {
      mediaId: media.media_id,
      link: media.link,
      thumbnailLink: media.thumbnail_link,
      type: media.type,
      createdAt: media.created_at,
    };
  },
};

export const commentTransformer = {
  fromDB: (comment: Record<string, unknown> | null): Record<string, unknown> | null => {
    if (!comment) return null;
    return {
      commentId: comment.commentId,
      postId: comment.postId,
      userId: comment.userId,
      parentId: comment.parentId,
      contents: comment.contents,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: comment.user ? userTransformer.fromDB(comment.user as Record<string, unknown>) : null,
      replies: ((comment.replies as Record<string, unknown>[]) || []).map(
        commentTransformer.fromDB,
      ),
    };
  },

  withPostFromDB: (comment: Record<string, unknown> | null) => {
    if (!comment) return null;
    const post = comment.post as Record<string, unknown> | undefined;
    return {
      ...commentTransformer.fromDB(comment),
      post: post ? { postId: post.post_id, contents: post.contents } : null,
    };
  },
};

export const notificationTransformer = {
  fromDB: (notification: Record<string, unknown> | null) => {
    if (!notification) return null;
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      data: notification.data ? JSON.parse(notification.data as string) : null,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      readAt: notification.readAt,
    };
  },
};

export const selectFields = {
  user: { user_id: true, nickname: true },
  userProfile: { user_id: true, nickname: true, created_at: true },
  postBasic: {
    post_id: true,
    user_id: true,
    contents: true,
    created_at: true,
    longitude: true,
    latitude: true,
  },
  media: { media_id: true, link: true, thumbnail_link: true, type: true, created_at: true },
} as const;

export default {
  mapFields,
  userTransformer,
  postTransformer,
  mediaTransformer,
  commentTransformer,
  notificationTransformer,
  selectFields,
};
