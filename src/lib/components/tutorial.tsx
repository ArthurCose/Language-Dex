import { useEffect, useState } from "react";
import { useUserDataSignal } from "../contexts/user-data";
import CatDialog from "./cat-dialog";
import { useTranslation } from "react-i18next";
import { DialogDescription } from "./dialog";
import {
  ConfirmationDialogAction,
  ConfirmationDialogActions,
} from "./confirmation-dialog";

const tutorialSteps = [
  { page: 1, textKey: "tutorial_start" },
  { page: 0, textKey: "read_tutorial" },
  { page: 1, textKey: "dictionary_tutorial" },
  { page: 2, textKey: "practice_tutorial" },
  { page: 3, textKey: "statistics_tutorial" },
  { page: 1, textKey: "tutorial_end" },
];

export default function Tutorial({
  setCurrentPage,
}: {
  setCurrentPage: (i: number) => void;
}) {
  const userDataSignal = useUserDataSignal();
  const [t] = useTranslation();
  const [open, setOpen] = useState(true);
  const [description, setDescription] = useState(tutorialSteps[0].textKey);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {}, []);

  const nextStep = (nextStepIndex: number) => {
    setStepIndex(nextStepIndex);
    setOpen(false);

    if (nextStepIndex >= tutorialSteps.length) {
      // completed the tutorial
      userDataSignal.set({
        ...userDataSignal.get(),
        completedTutorial: true,
      });
      return;
    }

    const nextStep = tutorialSteps[nextStepIndex];
    setCurrentPage(nextStep.page);

    setTimeout(() => {
      setDescription(nextStep.textKey);
      setOpen(true);
    }, 500);
  };

  return (
    <CatDialog open={open}>
      <DialogDescription>{t(description)}</DialogDescription>

      <ConfirmationDialogActions>
        {stepIndex > 0 && (
          <ConfirmationDialogAction
            disabled={!open}
            onPress={() => nextStep(stepIndex - 1)}
          >
            {t("Back")}
          </ConfirmationDialogAction>
        )}

        <ConfirmationDialogAction
          disabled={!open}
          onPress={() => nextStep(stepIndex + 1)}
        >
          {stepIndex == tutorialSteps.length - 1 ? t("Close") : t("Next")}
        </ConfirmationDialogAction>
      </ConfirmationDialogActions>
    </CatDialog>
  );
}
