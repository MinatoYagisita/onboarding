/*
  Warnings:

  - Added the required column `updatedAt` to the `documents` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DriveProvider" AS ENUM ('google_drive', 'box');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "content" TEXT,
ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalModifiedAt" TIMESTAMP(3),
ADD COLUMN     "sourceType" TEXT NOT NULL DEFAULT 'upload',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "drive_connections" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "DriveProvider" NOT NULL,
    "folderId" TEXT,
    "folderName" TEXT,
    "encryptedRefreshToken" TEXT NOT NULL,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drive_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drive_connections_organizationId_provider_key" ON "drive_connections"("organizationId", "provider");

-- CreateIndex
CREATE INDEX "documents_organizationId_externalId_idx" ON "documents"("organizationId", "externalId");

-- AddForeignKey
ALTER TABLE "drive_connections" ADD CONSTRAINT "drive_connections_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
