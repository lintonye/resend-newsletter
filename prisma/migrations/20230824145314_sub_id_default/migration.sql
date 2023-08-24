-- AlterTable
ALTER TABLE "Subscriber" ALTER COLUMN "id" SET DEFAULT (concat('sub_', gen_random_uuid()))::TEXT;
