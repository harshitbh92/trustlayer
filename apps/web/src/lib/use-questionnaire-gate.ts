"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/lib/auth-context";

export function useQuestionnaireGate() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  const isComplete = !!user?.personalityProfile?.questionnaireComplete;

  const requireComplete = useCallback(
    (action: () => void | Promise<void>) => {
      if (isComplete) {
        void action();
        return true;
      }
      setDialogOpen(true);
      return false;
    },
    [isComplete],
  );

  return {
    isComplete,
    dialogOpen,
    closeDialog: () => setDialogOpen(false),
    requireComplete,
  };
}
