-- CreateEnum
CREATE TYPE "PermissionSubject" AS ENUM ('STUDENT', 'COLLABORATOR_TUTOR', 'COLLABORATOR_SECRETARY');

-- CreateTable
CREATE TABLE "role_permissions" (
    "subject" "PermissionSubject" NOT NULL,
    "capability" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("subject","capability")
);
