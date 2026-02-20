-- CreateTable
CREATE TABLE "shelter" (
    "shelter_id" UUID NOT NULL DEFAULT uuidv7(),
    "name" VARCHAR(200) NOT NULL,
    "address" VARCHAR(300) NOT NULL,
    "shelter_type" VARCHAR(50) NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "capacity" INTEGER,
    "phone" VARCHAR(50),
    "sido_name" VARCHAR(40),
    "sigungu_name" VARCHAR(40),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "shelter_pk" PRIMARY KEY ("shelter_id")
);

-- CreateIndex
CREATE INDEX "idx_shelter_type_sido" ON "shelter"("shelter_type", "sido_name");

-- CreateIndex
CREATE INDEX "idx_shelter_location" ON "shelter"("latitude", "longitude");
