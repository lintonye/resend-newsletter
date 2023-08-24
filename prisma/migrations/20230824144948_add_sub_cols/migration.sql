-- AlterTable
ALTER TABLE "Subscriber" ADD COLUMN     "city" TEXT,
ADD COLUMN     "state" TEXT,
ALTER COLUMN "firstName" DROP NOT NULL,
ALTER COLUMN "country" DROP NOT NULL;
