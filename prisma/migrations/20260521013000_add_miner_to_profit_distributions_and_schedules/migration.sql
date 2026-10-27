-- Adiciona segregação de divisão de lucro por mineradora
ALTER TABLE "profit_distributions"
ADD COLUMN "minerId" BIGINT;

ALTER TABLE "profit_schedules"
ADD COLUMN "minerId" BIGINT;

CREATE INDEX "profit_distributions_minerId_idx" ON "profit_distributions"("minerId");
CREATE INDEX "profit_schedules_minerId_idx" ON "profit_schedules"("minerId");

ALTER TABLE "profit_distributions"
ADD CONSTRAINT "profit_distributions_minerId_fkey"
FOREIGN KEY ("minerId") REFERENCES "miners"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "profit_schedules"
ADD CONSTRAINT "profit_schedules_minerId_fkey"
FOREIGN KEY ("minerId") REFERENCES "miners"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
