import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AuthContext, AuthContextType } from "@/contexts/AuthContextObject";
import { User } from "@/types/auth";
import ProtectedRoute from "./ProtectedRoute";

const noop = () => null as never;

function makeUser(overrides: Partial<User>): User {
  return {
    id: "user-1",
    email: "u@x.com",
    name: "User",
    role: "hacker",
    roleLabel: "Hacker",
    permissions: [],
    createdAt: "2024-01-01",
    ...overrides,
  };
}

function renderProtected(authValue: Partial<AuthContextType>, guard: { roles?: string[]; permissions?: string[] } = { roles: ["admin"] }) {
  const fullValue: AuthContextType = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: async () => noop(),
    register: async () => noop(),
    updateProfile: async () => noop(),
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
              <ProtectedRoute roles={guard.roles} permissions={guard.permissions}>
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
    const hacker = makeUser({ id: "hacker-1", role: "hacker" });
    renderProtected({ user: hacker, isAuthenticated: true });

    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });

  it("affiche le contenu si l'utilisateur a le rôle autorisé", () => {
    const admin = makeUser({ id: "admin-1", role: "admin" });
    renderProtected({ user: admin, isAuthenticated: true });

    expect(screen.getByText("Contenu protégé")).toBeInTheDocument();
  });

  it("n'affiche rien ni ne redirige pendant le chargement de la session", () => {
    renderProtected({ user: null, isAuthenticated: false, isLoading: true });

    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
    expect(screen.queryByText("Page de connexion")).not.toBeInTheDocument();
    expect(screen.queryByText("Accueil")).not.toBeInTheDocument();
  });

  it("redirige vers / si l'utilisateur n'a pas la permission requise", () => {
    const support = makeUser({ id: "support-1", role: "support", permissions: ["logs.view"] });
    renderProtected({ user: support, isAuthenticated: true }, { permissions: ["roles.manage"] });

    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(screen.queryByText("Contenu protégé")).not.toBeInTheDocument();
  });

  it("affiche le contenu à un role custom qui detient la permission requise, sans etre dans un role list", () => {
    const auditor = makeUser({ id: "auditor-1", role: "auditeur_conformite", permissions: ["reports.view.all"] });
    renderProtected({ user: auditor, isAuthenticated: true }, { permissions: ["reports.view.all"] });

    expect(screen.getByText("Contenu protégé")).toBeInTheDocument();
  });
});
