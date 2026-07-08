import { CheckCircle2, AlertCircle } from "lucide-react";

export function ValidationIndicator({ isValid }: { isValid: boolean | null }) {
  if (isValid === null) return null;
  return isValid ? (
    <CheckCircle2 className="w-4 h-4 text-green-500 animate-in zoom-in" />
  ) : (
    <AlertCircle className="w-4 h-4 text-destructive animate-in shake" />
  );
}
