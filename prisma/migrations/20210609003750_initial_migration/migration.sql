-- CreateTable
CREATE TABLE "Sound" (
    "id" SERIAL NOT NULL,
    "path" TEXT NOT NULL,
    "cmd" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "last_call" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "number_played" INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Triger" (
    "id" SERIAL NOT NULL,
    "triger" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SoundToTriger" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Sound.path_unique" ON "Sound"("path");

-- CreateIndex
CREATE UNIQUE INDEX "Sound.cmd_unique" ON "Sound"("cmd");

-- CreateIndex
CREATE UNIQUE INDEX "Triger.triger_unique" ON "Triger"("triger");

-- CreateIndex
CREATE UNIQUE INDEX "_SoundToTriger_AB_unique" ON "_SoundToTriger"("A", "B");

-- CreateIndex
CREATE INDEX "_SoundToTriger_B_index" ON "_SoundToTriger"("B");

-- AddForeignKey
ALTER TABLE "_SoundToTriger" ADD FOREIGN KEY ("A") REFERENCES "Sound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SoundToTriger" ADD FOREIGN KEY ("B") REFERENCES "Triger"("id") ON DELETE CASCADE ON UPDATE CASCADE;
