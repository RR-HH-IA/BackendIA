/*
  Warnings:

  - The primary key for the `Document` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Workspace` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "Workspace" DROP CONSTRAINT "Workspace_ownerId_fkey";

-- AlterTable
ALTER TABLE "Document" DROP CONSTRAINT "Document_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "workspaceId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Document_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Document_id_seq";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "User_id_seq";

-- AlterTable
ALTER TABLE "Workspace" DROP CONSTRAINT "Workspace_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "ownerId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Workspace_id_seq";

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
