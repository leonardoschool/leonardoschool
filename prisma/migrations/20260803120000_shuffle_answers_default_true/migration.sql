-- Shuffle answers is now opt-out: new questions default to shuffled order.
-- Existing rows keep their stored value; only the column default changes.
ALTER TABLE "questions" ALTER COLUMN "shuffleAnswers" SET DEFAULT true;
