/*
  Warnings:

  - A unique constraint covering the columns `[cmd,server]` on the table `Sound` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Sound.cmd_unique";

-- CreateIndex
CREATE UNIQUE INDEX "Sound.cmd_server_unique" ON "Sound"("cmd", "server");
