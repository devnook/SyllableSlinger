-- CreateTable
CREATE TABLE "GameProgress" (
    "id" SERIAL NOT NULL,
    "word" VARCHAR(100) NOT NULL,
    "difficulty" VARCHAR(20) NOT NULL,
    "score" INTEGER NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameStatistics" (
    "id" SERIAL NOT NULL,
    "total_score" INTEGER NOT NULL DEFAULT 0,
    "words_completed" INTEGER NOT NULL DEFAULT 0,
    "easy_completed" INTEGER NOT NULL DEFAULT 0,
    "medium_completed" INTEGER NOT NULL DEFAULT 0,
    "hard_completed" INTEGER NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameStatistics_pkey" PRIMARY KEY ("id")
);
