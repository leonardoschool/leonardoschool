-- Un'esecuzione marcata anomala scarta l'intero lotto di proposte e salva
-- `proposalsCreated` a zero, con `distributionAfter` identica a `distributionBefore`.
-- Il risultato è che l'unica domanda che un revisore si pone davanti all'avviso —
-- quante proposte erano, e da che parte spingevano — non trovava risposta né nello
-- storico né nel log. Il lotto continua a essere scartato: qui si conserva solo la
-- traccia di che cosa il sistema avesse misurato.
ALTER TABLE "question_calibration_runs" ADD COLUMN "proposalsComputed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "question_calibration_runs" ADD COLUMN "proposalsHarder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "question_calibration_runs" ADD COLUMN "proposalsEasier" INTEGER NOT NULL DEFAULT 0;

-- Le esecuzioni già registrate non erano anomale (quelle anomale non hanno pubblicato
-- nulla): per loro il lotto calcolato coincide con quello pubblicato, e il default a
-- zero direbbe il falso.
UPDATE "question_calibration_runs"
SET "proposalsComputed" = "proposalsCreated"
WHERE "isAnomalous" = false;
