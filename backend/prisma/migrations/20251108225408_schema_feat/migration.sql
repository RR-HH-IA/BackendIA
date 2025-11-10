/*
  Warnings:

  - You are about to drop the column `embeddingId` on the `Document` table. All the data in the column will be lost.
  - Added the required column `collectionName` to the `Document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Workspace` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "embeddingId",
ADD COLUMN     "collectionName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "name" TEXT NOT NULL;
