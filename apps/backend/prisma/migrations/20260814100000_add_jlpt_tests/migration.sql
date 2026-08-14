-- CreateEnum
CREATE TYPE "JlptLevel" AS ENUM ('N5', 'N4', 'N3', 'N2', 'N1');

-- CreateEnum
CREATE TYPE "JlptSection" AS ENUM ('MOJI_GOI', 'BUNPOU', 'DOKKAI', 'CHOUKAI');

-- CreateEnum
CREATE TYPE "JlptQuestionType" AS ENUM ('KANJI_READING', 'KANJI_WRITING', 'CONTEXT_FILL', 'PARAPHRASE', 'USAGE', 'GRAMMAR_FILL', 'SENTENCE_ORDER', 'CLOZE_PASSAGE', 'READING_SHORT', 'READING_MID', 'READING_LONG', 'INFO_SEARCH', 'LISTEN_TASK', 'LISTEN_POINT', 'LISTEN_SPEECH', 'LISTEN_RESPONSE');

-- CreateEnum
CREATE TYPE "JlptSource" AS ENUM ('OFFICIAL_SAMPLE', 'ORIGINAL');

-- CreateEnum
CREATE TYPE "JlptAttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "jlpt_exam_sets" (
    "id" TEXT NOT NULL,
    "level" "JlptLevel" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" "JlptSource" NOT NULL DEFAULT 'ORIGINAL',
    "source_year" INTEGER,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jlpt_exam_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jlpt_tests" (
    "id" TEXT NOT NULL,
    "level" "JlptLevel" NOT NULL,
    "section" "JlptSection" NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT,
    "minutes" INTEGER NOT NULL,
    "source" "JlptSource" NOT NULL DEFAULT 'ORIGINAL',
    "source_year" INTEGER,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "set_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jlpt_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jlpt_question_groups" (
    "id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "type" "JlptQuestionType" NOT NULL,
    "instruction" TEXT NOT NULL,
    "instructionUz" TEXT,
    "passage" TEXT,
    "image_url" TEXT,
    "audio_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "jlpt_question_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jlpt_questions" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "stem" TEXT NOT NULL,
    "focus" TEXT,
    "image_url" TEXT,
    "audio_url" TEXT,
    "points" INTEGER NOT NULL DEFAULT 1,
    "explanationUz" TEXT,

    CONSTRAINT "jlpt_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jlpt_choices" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "jlpt_choices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jlpt_attempts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "test_id" TEXT,
    "set_id" TEXT,
    "status" "JlptAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "score" INTEGER,
    "max_score" INTEGER,
    "section_scores" JSONB,
    "passed" BOOLEAN,

    CONSTRAINT "jlpt_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jlpt_attempt_answers" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "chosen" INTEGER,
    "is_correct" BOOLEAN,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jlpt_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "jlpt_exam_sets_level_is_published_idx" ON "jlpt_exam_sets"("level", "is_published");

-- CreateIndex
CREATE INDEX "jlpt_tests_level_section_is_published_idx" ON "jlpt_tests"("level", "section", "is_published");

-- CreateIndex
CREATE INDEX "jlpt_tests_set_id_idx" ON "jlpt_tests"("set_id");

-- CreateIndex
CREATE UNIQUE INDEX "jlpt_tests_level_section_number_key" ON "jlpt_tests"("level", "section", "number");

-- CreateIndex
CREATE UNIQUE INDEX "jlpt_question_groups_test_id_number_key" ON "jlpt_question_groups"("test_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "jlpt_questions_group_id_number_key" ON "jlpt_questions"("group_id", "number");

-- CreateIndex
CREATE UNIQUE INDEX "jlpt_choices_question_id_number_key" ON "jlpt_choices"("question_id", "number");

-- CreateIndex
CREATE INDEX "jlpt_attempts_user_id_status_idx" ON "jlpt_attempts"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "jlpt_attempt_answers_attempt_id_question_id_key" ON "jlpt_attempt_answers"("attempt_id", "question_id");

-- AddForeignKey
ALTER TABLE "jlpt_tests" ADD CONSTRAINT "jlpt_tests_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "jlpt_exam_sets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jlpt_question_groups" ADD CONSTRAINT "jlpt_question_groups_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "jlpt_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jlpt_questions" ADD CONSTRAINT "jlpt_questions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "jlpt_question_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jlpt_choices" ADD CONSTRAINT "jlpt_choices_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "jlpt_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jlpt_attempts" ADD CONSTRAINT "jlpt_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jlpt_attempts" ADD CONSTRAINT "jlpt_attempts_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "jlpt_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jlpt_attempts" ADD CONSTRAINT "jlpt_attempts_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "jlpt_exam_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jlpt_attempt_answers" ADD CONSTRAINT "jlpt_attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "jlpt_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jlpt_attempt_answers" ADD CONSTRAINT "jlpt_attempt_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "jlpt_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

