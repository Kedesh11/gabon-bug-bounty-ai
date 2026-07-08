import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext, AuthContextType } from "@/contexts/AuthContextObject";
import { User } from "@/types/auth";
import ProtectedRoute from "./ProtectedRoute";

const noop = () => null;

function renderProtected(authValue: Partial<AuthContextType>) {
  const fullValue: AuthContextType = {
    user: null,
    isAuthenticated: false,
    login: noop,
    register: noop,
    updateProfile: noop,
    logout: () => {},
    ...authValue,
  };

  return render(
    <AuthContext.Provider value={fullValue}>
      <MemoryRouter initialEntries={["/protege"]}>
        <Routes>
          <Route
            path="/protege"
            element={
              <ProtectedRoute roles={["admin"]}>
                <div>Contenu protégé</div>
              </ProtectedRoute>
            }
          />
          <Route path="/connexion" element={<div>Page de connexion</div>} />
          <Route path="/" element={<div>Accueil</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe("ProtectedRoute", () => {
  it("redirige vers /connexion si l'utilisateur n'est pas authentifié", () => {
    renderProtected({ user: null, isAuthenticated: false });

    expect(screen.getByText("Page de connexion")).toBeInTheDocument();
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });

  it("redirige vers / si le rôle de l'utilisateur n'est pas autorisé", () => {
    const hacker: User = { id: "hacker-1", email: "h@x.com", name: "Hacker", role: "hacker", createdAt: "2024-01-01" };
    renderProtected({ user: hacker, isAuthenticated: true });

    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });

  it("affiche le contenu si l'utilisateur a le rôle autorisé", () => {
    const admin: User = { id: "admin-1", email: "a@x.com", name: "Admin", role: "admin", createdAt: "2024-01-01" };
    renderProtected({ user: admin, isAuthenticated: true });

    expect(screen.getByText("Contenu protégé")).toBeInTheDocument();
  });
});
