"use client";

import { useRouter } from "next/navigation";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function QuestionnaireGateDialog({ open, onClose }: Props) {
  const router = useRouter();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="surface-elevated w-full max-w-md p-6">
        <h2 className="text-lg font-semibold">Complete your questionnaire</h2>
        <p className="mt-2 text-sm text-muted">
          This feature uses your personality profile to match you with the right
          conversations. Finish the short questionnaire to continue — or skip and
          come back later from your profile.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/onboarding");
            }}
            className="btn-primary"
          >
            Complete now
          </button>
        </div>
      </div>
    </div>
  );
}
