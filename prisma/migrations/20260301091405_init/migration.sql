-- CreateEnum
CREATE TYPE "LinkPrecedence" AS ENUM ('primary', 'secondary');

-- CreateTable
CREATE TABLE "contacts" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT,
    "email" TEXT,
    "linkedId" INTEGER,
    "linkPrecedence" "LinkPrecedence" NOT NULL DEFAULT 'primary',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_linkedId_fkey" FOREIGN KEY ("linkedId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
