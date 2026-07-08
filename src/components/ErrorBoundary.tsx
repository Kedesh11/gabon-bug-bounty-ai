import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Erreur non interceptée :", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h1 className="text-xl font-semibold">Une erreur inattendue s'est produite</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            L'équipe technique a été notifiée. Vous pouvez recharger la page pour continuer.
          </p>
          <Button onClick={() => window.location.reload()}>Recharger la page</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
