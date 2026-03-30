import { prisma } from '../prismaClient.ts';

export interface PollWithResults {
  pollId: string;
  userId: string;
  title: string;
  description: string | null;
  longitude: number | null;
  latitude: number | null;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  user: { userId: string; nickname: string | null };
  options: {
    optionId: string;
    label: string;
    sortOrder: number;
    voteCount: number;
  }[];
  totalVotes: number;
  myVoteOptionId: string | null;
}

function transformPoll(poll: Record<string, unknown>, currentUserId?: string): PollWithResults {
  const p = poll as any;
  const options = (p.options || []).map((opt: any) => ({
    optionId: opt.optionId,
    label: opt.label,
    sortOrder: opt.sortOrder,
    voteCount: opt._count?.votes ?? opt.votes?.length ?? 0,
  }));

  const totalVotes = options.reduce((sum: number, o: any) => sum + o.voteCount, 0);

  let myVoteOptionId: string | null = null;
  if (currentUserId && p.options) {
    for (const opt of p.options) {
      const myVote = opt.votes?.find((v: any) => v.userId === currentUserId);
      if (myVote) {
        myVoteOptionId = opt.optionId;
        break;
      }
    }
  }

  return {
    pollId: p.pollId,
    userId: p.userId,
    title: p.title,
    description: p.description,
    longitude: p.longitude,
    latitude: p.latitude,
    expiresAt: p.expiresAt,
    isActive: p.isActive,
    createdAt: p.createdAt,
    user: p.user
      ? { userId: p.user.user_id, nickname: p.user.nickname }
      : { userId: p.userId, nickname: null },
    options,
    totalVotes,
    myVoteOptionId,
  };
}

const pollInclude = (currentUserId?: string) => ({
  user: { select: { user_id: true, nickname: true } },
  options: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      _count: { select: { votes: true } },
      votes: currentUserId ? { where: { userId: currentUserId }, select: { userId: true } } : false,
    },
  },
});

export const createPoll = async (
  userId: string,
  title: string,
  options: string[],
  durationHours: number,
  description?: string | null,
  longitude?: number | null,
  latitude?: number | null,
): Promise<PollWithResults> => {
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

  const poll = await prisma.poll.create({
    data: {
      userId,
      title,
      description: description || null,
      longitude: longitude || null,
      latitude: latitude || null,
      expiresAt,
      options: {
        create: options.map((label, idx) => ({
          label,
          sortOrder: idx,
        })),
      },
    },
    include: pollInclude(userId),
  });

  return transformPoll(poll as unknown as Record<string, unknown>, userId);
};

export const getPolls = async (
  currentUserId: string,
  cursor?: string,
  limit: number = 20,
): Promise<PollWithResults[]> => {
  const polls = await prisma.poll.findMany({
    where: {
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    include: pollInclude(currentUserId),
    orderBy: { createdAt: 'desc' },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { pollId: cursor } } : {}),
  });

  return polls.map((p) => transformPoll(p as unknown as Record<string, unknown>, currentUserId));
};

export const getPollById = async (
  pollId: string,
  currentUserId?: string,
): Promise<PollWithResults | null> => {
  const poll = await prisma.poll.findUnique({
    where: { pollId },
    include: pollInclude(currentUserId),
  });

  if (!poll) return null;
  return transformPoll(poll as unknown as Record<string, unknown>, currentUserId);
};

export const votePoll = async (
  pollId: string,
  optionId: string,
  userId: string,
): Promise<PollWithResults> => {
  // 투표 생성 (unique 제약 조건으로 중복 방지)
  await prisma.poll_vote.create({
    data: { pollId, optionId, userId },
  });

  // 업데이트된 투표 결과 반환
  const poll = await prisma.poll.findUnique({
    where: { pollId },
    include: pollInclude(userId),
  });

  return transformPoll(poll as unknown as Record<string, unknown>, userId);
};

export const closePoll = async (pollId: string): Promise<void> => {
  await prisma.poll.update({
    where: { pollId },
    data: { isActive: false },
  });
};

export const getMyPolls = async (userId: string): Promise<PollWithResults[]> => {
  const polls = await prisma.poll.findMany({
    where: { userId },
    include: pollInclude(userId),
    orderBy: { createdAt: 'desc' },
  });

  return polls.map((p) => transformPoll(p as unknown as Record<string, unknown>, userId));
};
