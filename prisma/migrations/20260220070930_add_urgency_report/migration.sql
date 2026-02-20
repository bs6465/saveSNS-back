-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateTable
CREATE TABLE "air_quality" (
    "air_quality_id" UUID NOT NULL DEFAULT uuidv7(),
    "station_name" VARCHAR NOT NULL,
    "sido_name" VARCHAR NOT NULL,
    "pm25_value" SMALLINT,
    "pm10_value" SMALLINT,
    "pm25_grade" SMALLINT,
    "pm10_grade" SMALLINT,
    "khai_grade" SMALLINT,
    "khai_value" SMALLINT,
    "o3_value" REAL,
    "co_value" REAL,
    "no2_value" REAL,
    "so2_value" REAL,
    "data_time" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "air_quality_pk" PRIMARY KEY ("air_quality_id")
);

-- CreateTable
CREATE TABLE "comment" (
    "commentId" UUID NOT NULL DEFAULT uuidv7(),
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "parentId" UUID,
    "contents" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6),

    CONSTRAINT "comment_pk" PRIMARY KEY ("commentId")
);

-- CreateTable
CREATE TABLE "post_like" (
    "likeId" UUID NOT NULL DEFAULT uuidv7(),
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_like_pk" PRIMARY KEY ("likeId")
);

-- CreateTable
CREATE TABLE "media_storage" (
    "media_id" UUID NOT NULL DEFAULT uuidv7(),
    "link" VARCHAR,
    "thumbnail_link" VARCHAR,
    "post_id" UUID NOT NULL,
    "type" VARCHAR(20),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mediastorage_pk" PRIMARY KEY ("media_id")
);

-- CreateTable
CREATE TABLE "posts" (
    "post_id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "contents" TEXT NOT NULL,
    "longitude" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "location" geometry DEFAULT st_setsrid(st_makepoint(longitude, latitude), 4326),

    CONSTRAINT "posts_pk" PRIMARY KEY ("post_id")
);

-- CreateTable
CREATE TABLE "sig" (
    "gid" SMALLSERIAL NOT NULL,
    "sig_cd" INTEGER NOT NULL,
    "sig_eng_nm" VARCHAR(40) NOT NULL,
    "sig_kor_nm" VARCHAR(40) NOT NULL,
    "geom" geometry NOT NULL,
    "sido_nm" VARCHAR(40) NOT NULL,

    CONSTRAINT "sig_pkey" PRIMARY KEY ("gid")
);

-- CreateTable
CREATE TABLE "users_account" (
    "user_id" UUID NOT NULL DEFAULT uuidv7(),
    "username" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255),
    "nickname" VARCHAR(255),
    "provider" VARCHAR(255) NOT NULL DEFAULT 'local',
    "sns_id" VARCHAR(255),

    CONSTRAINT "users_pk" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "users_location" (
    "user_id" UUID NOT NULL,
    "longitude" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "location" geometry DEFAULT st_setsrid(st_makepoint(longitude, latitude), 4326),
    "nx" SMALLINT DEFAULT (kma_lonlat_to_grid(longitude, latitude)).nx,
    "ny" SMALLINT DEFAULT (kma_lonlat_to_grid(longitude, latitude)).ny,

    CONSTRAINT "user_locations_pk" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "weather_short_term_forecast" (
    "weather_short_term_forecast_id" UUID NOT NULL DEFAULT uuidv7(),
    "nx" SMALLINT NOT NULL,
    "ny" SMALLINT NOT NULL,
    "base_datetime" TIMESTAMP(6) NOT NULL,
    "fcst_datetime" TIMESTAMP(6) NOT NULL,
    "tmp" SMALLINT,
    "uuu" SMALLINT,
    "vvv" SMALLINT,
    "vec" SMALLINT,
    "wsd" SMALLINT,
    "sky" SMALLINT,
    "pty" SMALLINT,
    "pop" SMALLINT,
    "wav" SMALLINT,
    "pcp" SMALLINT,
    "reh" SMALLINT,
    "sno" SMALLINT,
    "tmn" SMALLINT,
    "tmx" SMALLINT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_short_term_forecast_pk" PRIMARY KEY ("weather_short_term_forecast_id")
);

-- CreateTable
CREATE TABLE "weather_ultra_short_term_forecast" (
    "weather_ultra_short_term_forecast_id" UUID NOT NULL DEFAULT uuidv7(),
    "nx" SMALLINT NOT NULL,
    "ny" SMALLINT NOT NULL,
    "base_datetime" TIMESTAMP(6) NOT NULL,
    "fcst_datetime" TIMESTAMP(6) NOT NULL,
    "t1h" SMALLINT,
    "rn1" SMALLINT,
    "sky" SMALLINT,
    "uuu" SMALLINT,
    "vvv" SMALLINT,
    "reh" SMALLINT,
    "pty" SMALLINT,
    "lgt" SMALLINT,
    "vec" SMALLINT,
    "wsd" SMALLINT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_ultra_short_term_forecast_pk" PRIMARY KEY ("weather_ultra_short_term_forecast_id")
);

-- CreateTable
CREATE TABLE "local_news" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "title" VARCHAR(500) NOT NULL,
    "summary" TEXT,
    "link" VARCHAR(1000) NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "regionCode" VARCHAR(20) NOT NULL,
    "publishedAt" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "local_news_pk" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "air_quality_forecast" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "sido_name" VARCHAR(50) NOT NULL,
    "inform_code" VARCHAR(10) NOT NULL,
    "forecast_date" TIMESTAMP(6) NOT NULL,
    "publish_time" TIMESTAMP(6) NOT NULL,
    "grade" SMALLINT NOT NULL,
    "inform_cause" TEXT,
    "inform_overall" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "air_quality_forecast_pk" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disaster_alert" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "sn" INTEGER NOT NULL,
    "msg_cn" TEXT NOT NULL,
    "rcptn_rgn_nm" VARCHAR(200) NOT NULL,
    "crt_dt" TIMESTAMP(6),
    "emrg_step_nm" VARCHAR(50) NOT NULL,
    "dst_se_nm" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disaster_alert_pk" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traffic_incidents" (
    "traffic_incident_id" UUID NOT NULL DEFAULT uuidv7(),
    "incident_id" VARCHAR(100) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "road_name" VARCHAR(100),
    "longitude" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "location" geometry,
    "start_time" TIMESTAMP(6) NOT NULL,
    "end_time" TIMESTAMP(6),
    "severity" SMALLINT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "traffic_incidents_pk" PRIMARY KEY ("traffic_incident_id")
);

-- CreateTable
CREATE TABLE "road_traffic" (
    "road_traffic_id" UUID NOT NULL DEFAULT uuidv7(),
    "road_name" VARCHAR(100) NOT NULL,
    "link_id" VARCHAR(50),
    "speed" SMALLINT,
    "status" SMALLINT NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "location" geometry,
    "data_time" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "road_traffic_pk" PRIMARY KEY ("road_traffic_id")
);

-- CreateTable
CREATE TABLE "urgency_report" (
    "urgencyReportId" UUID NOT NULL DEFAULT uuidv7(),
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "score" REAL NOT NULL,
    "level" VARCHAR(20) NOT NULL,
    "category" VARCHAR(50),
    "matchedKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence" REAL NOT NULL DEFAULT 0,
    "longitude" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "urgency_report_pk" PRIMARY KEY ("urgencyReportId")
);

-- CreateTable
CREATE TABLE "push_token" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "deviceType" VARCHAR(20),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_token_pk" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "userId" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "data" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(6),

    CONSTRAINT "notification_pk" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "air_quality_sido_name_idx" ON "air_quality"("sido_name", "data_time");

-- CreateIndex
CREATE UNIQUE INDEX "uq_air_quality_station_time" ON "air_quality"("station_name", "data_time");

-- CreateIndex
CREATE INDEX "idx_comment_post" ON "comment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_comment_user" ON "comment"("userId");

-- CreateIndex
CREATE INDEX "idx_post_like_user" ON "post_like"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_post_like_post_user" ON "post_like"("postId", "userId");

-- CreateIndex
CREATE INDEX "sig_geom_idx" ON "sig" USING GIST ("geom");

-- CreateIndex
CREATE UNIQUE INDEX "username_uq" ON "users_account"("username");

-- CreateIndex
CREATE INDEX "idx_users_grid_cover" ON "users_location"("nx", "ny", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_weather_short_term_forecast" ON "weather_short_term_forecast"("nx", "ny", "fcst_datetime");

-- CreateIndex
CREATE UNIQUE INDEX "uq_weather_forecast" ON "weather_ultra_short_term_forecast"("nx", "ny", "fcst_datetime");

-- CreateIndex
CREATE INDEX "idx_local_news_region" ON "local_news"("regionCode", "publishedAt");

-- CreateIndex
CREATE INDEX "idx_air_quality_forecast_sido" ON "air_quality_forecast"("sido_name", "forecast_date");

-- CreateIndex
CREATE UNIQUE INDEX "uq_air_quality_forecast" ON "air_quality_forecast"("sido_name", "inform_code", "forecast_date");

-- CreateIndex
CREATE UNIQUE INDEX "disaster_alert_sn_key" ON "disaster_alert"("sn");

-- CreateIndex
CREATE INDEX "idx_disaster_alert_region" ON "disaster_alert"("rcptn_rgn_nm", "crt_dt");

-- CreateIndex
CREATE INDEX "idx_traffic_incidents_location" ON "traffic_incidents" USING GIST ("location");

-- CreateIndex
CREATE UNIQUE INDEX "uq_traffic_incident_id" ON "traffic_incidents"("incident_id");

-- CreateIndex
CREATE INDEX "idx_road_traffic_road" ON "road_traffic"("road_name", "data_time");

-- CreateIndex
CREATE INDEX "idx_road_traffic_location" ON "road_traffic" USING GIST ("location");

-- CreateIndex
CREATE INDEX "idx_urgency_report_post" ON "urgency_report"("postId");

-- CreateIndex
CREATE INDEX "idx_urgency_report_level" ON "urgency_report"("level", "createdAt");

-- CreateIndex
CREATE INDEX "idx_urgency_report_user" ON "urgency_report"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "push_token_token_key" ON "push_token"("token");

-- CreateIndex
CREATE INDEX "idx_push_token_user" ON "push_token"("userId");

-- CreateIndex
CREATE INDEX "idx_notification_user" ON "notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_notification_unread" ON "notification"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_posts_fk" FOREIGN KEY ("postId") REFERENCES "posts"("post_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_users_fk" FOREIGN KEY ("userId") REFERENCES "users_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "comment" ADD CONSTRAINT "comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "comment"("commentId") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "post_like" ADD CONSTRAINT "post_like_posts_fk" FOREIGN KEY ("postId") REFERENCES "posts"("post_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "post_like" ADD CONSTRAINT "post_like_users_fk" FOREIGN KEY ("userId") REFERENCES "users_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "media_storage" ADD CONSTRAINT "mediastorage_posts_fk" FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_users_account_fk" FOREIGN KEY ("user_id") REFERENCES "users_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users_location" ADD CONSTRAINT "user_locations_users_fk" FOREIGN KEY ("user_id") REFERENCES "users_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "urgency_report" ADD CONSTRAINT "urgency_report_posts_fk" FOREIGN KEY ("postId") REFERENCES "posts"("post_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "urgency_report" ADD CONSTRAINT "urgency_report_users_fk" FOREIGN KEY ("userId") REFERENCES "users_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "push_token" ADD CONSTRAINT "push_token_users_fk" FOREIGN KEY ("userId") REFERENCES "users_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_users_fk" FOREIGN KEY ("userId") REFERENCES "users_account"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;
