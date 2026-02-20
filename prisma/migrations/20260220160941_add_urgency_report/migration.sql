-- CreateTable
CREATE TABLE "urgency_report" (
    "urgency_report_id" UUID NOT NULL DEFAULT uuidv7(),
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "score" REAL NOT NULL,
    "level" VARCHAR(20) NOT NULL,
    "category" VARCHAR(50),
    "matched_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence" REAL NOT NULL DEFAULT 0,
    "longitude" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "report_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "urgency_report_pk" PRIMARY KEY ("urgency_report_id")
);

-- CreateIndex
CREATE INDEX "idx_urgency_report_post" ON "urgency_report"("post_id");

-- CreateIndex
CREATE INDEX "idx_urgency_report_level" ON "urgency_report"("level", "created_at");

-- CreateIndex
CREATE INDEX "idx_urgency_report_user" ON "urgency_report"("user_id");

-- AddForeignKey
ALTER TABLE "urgency_report" ADD CONSTRAINT "urgency_report_posts_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "urgency_report" ADD CONSTRAINT "urgency_report_users_fk" FOREIGN KEY ("user_id") REFERENCES "users_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;
