import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useContent } from "@/hooks/api/content";

const NotFound = () => {
  const location = useLocation();
  const message = useContent("not-found.message", "Oops! Page not found");
  const linkLabel = useContent("not-found.link-label", "Return to Home");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{message}</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          {linkLabel}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
