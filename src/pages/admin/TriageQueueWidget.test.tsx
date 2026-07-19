import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TriageQueueWidget } from "./TriageQueueWidget";
import { Report } from "@/types/domain";

function makeReport(overrides: Partial<Report>): Report {
  return {
    id: "r1",
    title: "Report",
    description: "desc",
    severity: "moyenne",
    status: "soumis",
    hackerId: "h1",
    hackerName: "Hacker",
    programmeId: "p1",
    programmeName: "Programme",
    entrepriseId: "e1",
    reward: 0,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    vulnerability: "XSS",
    proof: "poc",
    ...overrides,
  };
}

// useContent() (src/hooks/api/content.ts) queries the API via react-query — no
// QueryClientProvider in this tree would throw synchronously. retry: false so a
// failed fetch (no API server in this unit test) fails fast instead of retrying;
// either way useContent() falls back to its default text, same as before.
function renderWidget(reports: Report[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route path="/admin" element={<TriageQueueWidget reports={reports} />} />
          <Route path="/admin/rapports" element={<div>Page rapports</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TriageQueueWidget", () => {
  it("only shows reports still pending triage", () => {
    renderWidget([
      makeReport({ id: "done", status: "résolu", title: "Resolved" }),
      makeReport({ id: "pending", status: "soumis", title: "Pending" }),
    ]);
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.queryByText("Resolved")).not.toBeInTheDocument();
  });

  it("orders by severity (critique first) regardless of insertion order", () => {
    renderWidget([
      makeReport({ id: "a", severity: "faible", title: "Low" }),
      makeReport({ id: "b", severity: "critique", title: "Critical" }),
    ]);
    const titles = screen.getAllByText(/^(Low|Critical)$/).map((el) => el.textContent);
    expect(titles[0]).toBe("Critical");
  });

  it("navigates to the report's detail on click", () => {
    renderWidget([makeReport({ id: "r1", title: "Clickable" })]);
    fireEvent.click(screen.getByText("Clickable"));
    expect(screen.getByText("Page rapports")).toBeInTheDocument();
  });

  it("paginates the list view at 10 items per page", () => {
    const many = Array.from({ length: 12 }, (_, i) => makeReport({ id: `r${i}`, title: `Report ${i}` }));
    renderWidget(many);
    expect(screen.getByText("Page 1 / 2")).toBeInTheDocument();
  });

  it("shows an empty state when nothing is pending", () => {
    renderWidget([]);
    expect(screen.getByText("Aucun rapport en attente de triage.")).toBeInTheDocument();
  });
});
