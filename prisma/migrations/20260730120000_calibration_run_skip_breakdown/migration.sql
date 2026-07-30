-- Il riepilogo di un'esecuzione deve saper rispondere a "perché non si è mosso niente".
-- `skippedManual` non è mai stato scritto con un valore diverso da zero: una difficoltà
-- decisa a mano non viene saltata, la proposta si mostra comunque e la conferma la dà
-- un umano. Al suo posto arrivano i motivi di scarto che esistono davvero.
ALTER TABLE "question_calibration_runs" DROP COLUMN "skippedManual";
ALTER TABLE "question_calibration_runs" ADD COLUMN "skippedAlreadyCorrect" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "question_calibration_runs" ADD COLUMN "skippedQualityFlag" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "question_calibration_runs" ADD COLUMN "skippedBucketFloor" INTEGER NOT NULL DEFAULT 0;
