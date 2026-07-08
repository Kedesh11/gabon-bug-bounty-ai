import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDataStore } from "./dataStore";

const baseProgramme = {
  name: "Programme Test",
  entrepriseId: "entreprise-1",
  entrepriseName: "Ministère Numérique",
  description: "Un programme de test",
  scope: ["test.gouv.com"],
  minReward: 10000,
  maxReward: 100000,
  status: "actif" as const,
};

const baseReport = {
  title: "XSS sur /test",
  description: "Description du rapport",
  severity: "haute" as const,
  hackerId: "hacker-1",
  hackerName: "CyberPanther",
  programmeId: "prog-1",
  programmeName: "API Gouvernementale v2",
  entrepriseId: "entreprise-1",
  vulnerability: "XSS",
  proof: "preuve de concept",
};

beforeEach(() => {
  localStorage.clear();
});

describe("useDataStore — programmes", () => {
  it("ajoute un programme avec un id et une date générés", () => {
    const { result } = renderHook(() => useDataStore());
    const initialCount = result.current.programmes.length;

    act(() => {
      result.current.addProgramme(baseProgramme);
    });

    expect(result.current.programmes).toHaveLength(initialCount + 1);
    const created = result.current.programmes.at(-1)!;
    expect(created.id).toMatch(/^prog-/);
    expect(created.reportsCount).toBe(0);
    expect(created.name).toBe("Programme Test");
  });

  it("persiste les programmes dans localStorage", () => {
    const { result } = renderHook(() => useDataStore());

    act(() => {
      result.current.addProgramme(baseProgramme);
    });

    const stored = JSON.parse(localStorage.getItem("bb_programmes") ?? "[]");
    expect(stored.some((p: { name: string }) => p.name === "Programme Test")).toBe(true);
  });

  it("met à jour un programme existant", () => {
    const { result } = renderHook(() => useDataStore());

    act(() => {
      result.current.addProgramme(baseProgramme);
    });
    const id = result.current.programmes.at(-1)!.id;

    act(() => {
      result.current.updateProgramme(id, { status: "pause" });
    });

    expect(result.current.programmes.find(p => p.id === id)?.status).toBe("pause");
  });

  it("supprime un programme", () => {
    const { result } = renderHook(() => useDataStore());

    act(() => {
      result.current.addProgramme(baseProgramme);
    });
    const id = result.current.programmes.at(-1)!.id;

    act(() => {
      result.current.deleteProgramme(id);
    });

    expect(result.current.programmes.find(p => p.id === id)).toBeUndefined();
  });
});

describe("useDataStore — reports", () => {
  it("crée un rapport avec le statut 'soumis' et une récompense nulle", () => {
    const { result } = renderHook(() => useDataStore());

    act(() => {
      result.current.addReport(baseReport);
    });

    const created = result.current.reports.at(-1)!;
    expect(created.status).toBe("soumis");
    expect(created.reward).toBe(0);
    expect(created.aiAnalysis).toBeDefined();
  });

  it("enregistre une activité de type 'reward' quand une récompense positive est appliquée", () => {
    const { result } = renderHook(() => useDataStore());

    act(() => {
      result.current.addReport(baseReport);
    });
    const id = result.current.reports.at(-1)!.id;
    const activityCountBefore = result.current.activities.length;

    act(() => {
      result.current.updateReport(id, { status: "accepté", reward: 250000 });
    });

    expect(result.current.reports.find(r => r.id === id)?.reward).toBe(250000);
    expect(result.current.activities.length).toBe(activityCountBefore + 1);
    expect(result.current.activities[0].type).toBe("reward");
  });

  it("ne crée pas d'activité de récompense si le montant est nul", () => {
    const { result } = renderHook(() => useDataStore());

    act(() => {
      result.current.addReport(baseReport);
    });
    const id = result.current.reports.at(-1)!.id;
    const activityCountBefore = result.current.activities.length;

    act(() => {
      result.current.updateReport(id, { status: "rejeté" });
    });

    expect(result.current.activities.length).toBe(activityCountBefore);
  });

  it("supprime un rapport", () => {
    const { result } = renderHook(() => useDataStore());

    act(() => {
      result.current.addReport(baseReport);
    });
    const id = result.current.reports.at(-1)!.id;

    act(() => {
      result.current.deleteReport(id);
    });

    expect(result.current.reports.find(r => r.id === id)).toBeUndefined();
  });
});

describe("useDataStore — config & reset", () => {
  it("met à jour partiellement la configuration système", () => {
    const { result } = renderHook(() => useDataStore());

    act(() => {
      result.current.updateConfig({ maintenanceMode: true });
    });

    expect(result.current.config.maintenanceMode).toBe(true);
    // Les autres champs ne doivent pas être écrasés
    expect(result.current.config.platformName).toBe("Gabon Bug Bounty AI");
  });

  it("recharge les données précédemment persistées au montage suivant", () => {
    const { result, unmount } = renderHook(() => useDataStore());

    act(() => {
      result.current.addProgramme(baseProgramme);
    });
    unmount();

    const { result: result2 } = renderHook(() => useDataStore());
    expect(result2.current.programmes.some(p => p.name === "Programme Test")).toBe(true);
  });
});
