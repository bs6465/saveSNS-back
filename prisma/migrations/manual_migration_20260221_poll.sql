-- 투표 기능 테이블 추가 마이그레이션

-- 투표 테이블
CREATE TABLE IF NOT EXISTS "poll" (
    "pollId"      UUID         NOT NULL DEFAULT uuidv7(),
    "userId"      UUID         NOT NULL,
    "title"       VARCHAR(200) NOT NULL,
    "description" TEXT,
    "longitude"   DOUBLE PRECISION,
    "latitude"    DOUBLE PRECISION,
    "expiresAt"   TIMESTAMP(6) NOT NULL,
    "isActive"    BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT "poll_pk" PRIMARY KEY ("pollId"),
    CONSTRAINT "poll_users_fk" FOREIGN KEY ("userId")
        REFERENCES "users_account" ("user_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_poll_user" ON "poll" ("userId");
CREATE INDEX IF NOT EXISTS "idx_poll_active" ON "poll" ("isActive", "expiresAt");

-- 투표 선택지 테이블
CREATE TABLE IF NOT EXISTS "poll_option" (
    "optionId"  UUID         NOT NULL DEFAULT uuidv7(),
    "pollId"    UUID         NOT NULL,
    "label"     VARCHAR(100) NOT NULL,
    "sortOrder" SMALLINT     NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT "poll_option_pk" PRIMARY KEY ("optionId"),
    CONSTRAINT "poll_option_poll_fk" FOREIGN KEY ("pollId")
        REFERENCES "poll" ("pollId") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_poll_option_poll" ON "poll_option" ("pollId");

-- 투표 참여 테이블
CREATE TABLE IF NOT EXISTS "poll_vote" (
    "voteId"    UUID         NOT NULL DEFAULT uuidv7(),
    "pollId"    UUID         NOT NULL,
    "optionId"  UUID         NOT NULL,
    "userId"    UUID         NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT now(),
    CONSTRAINT "poll_vote_pk" PRIMARY KEY ("voteId"),
    CONSTRAINT "poll_vote_option_fk" FOREIGN KEY ("optionId")
        REFERENCES "poll_option" ("optionId") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "poll_vote_users_fk" FOREIGN KEY ("userId")
        REFERENCES "users_account" ("user_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_poll_vote_user" ON "poll_vote" ("pollId", "userId");
CREATE INDEX IF NOT EXISTS "idx_poll_vote_option" ON "poll_vote" ("optionId");
