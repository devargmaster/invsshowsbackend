-- CreateTable
CREATE TABLE "carousel_photos" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT,
    "linkUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carousel_photos_pkey" PRIMARY KEY ("id")
);

-- Enable RLS
ALTER TABLE "carousel_photos" ENABLE ROW LEVEL SECURITY;

