import type { ContentValueType } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

// ---------------------------------------------------------------------------
// Content entries (generic key -> value store, text or JSON)
// ---------------------------------------------------------------------------

export async function listContentEntries() {
  return prisma.contentEntry.findMany({ orderBy: { key: "asc" } });
}

function assertValidValue(type: ContentValueType, value: string) {
  if (type !== "json") return;
  try {
    JSON.parse(value);
  } catch {
    throw new HttpError(400, "La valeur doit être un JSON valide pour une entrée de type json");
  }
}

export interface UpsertContentEntryInput {
  key: string;
  type: ContentValueType;
  value: string;
}

// Upsert by key rather than create/update-by-id: pages reference entries by their
// stable key ("documentation.sections"), so admin editing is always "set this key",
// whether or not it has been seeded yet.
export async function upsertContentEntry(input: UpsertContentEntryInput, updatedById: string) {
  const key = input.key.trim();
  if (key.length < 2) throw new HttpError(400, "La clé doit contenir au moins 2 caractères");
  assertValidValue(input.type, input.value);

  return prisma.contentEntry.upsert({
    where: { key },
    update: { type: input.type, value: input.value, updatedById },
    create: { key, type: input.type, value: input.value, updatedById },
  });
}

export async function deleteContentEntry(id: string) {
  const existing = await prisma.contentEntry.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Entrée introuvable");
  await prisma.contentEntry.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Navbar items
// ---------------------------------------------------------------------------

export async function listNavbarItems(onlyVisible: boolean) {
  return prisma.navbarItem.findMany({
    where: onlyVisible ? { visible: true } : undefined,
    orderBy: { order: "asc" },
  });
}

export interface NavbarItemInput {
  label: string;
  url: string;
  isExternal?: boolean;
  visible?: boolean;
}

export async function createNavbarItem(input: NavbarItemInput) {
  const maxOrder = await prisma.navbarItem.aggregate({ _max: { order: true } });
  return prisma.navbarItem.create({
    data: {
      label: input.label.trim(),
      url: input.url.trim(),
      isExternal: input.isExternal ?? false,
      visible: input.visible ?? true,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
}

export interface UpdateNavbarItemInput {
  label?: string;
  url?: string;
  isExternal?: boolean;
  visible?: boolean;
}

export async function updateNavbarItem(id: string, input: UpdateNavbarItemInput) {
  const existing = await prisma.navbarItem.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Lien introuvable");
  return prisma.navbarItem.update({
    where: { id },
    data: { ...input, label: input.label?.trim(), url: input.url?.trim() },
  });
}

export async function deleteNavbarItem(id: string) {
  const existing = await prisma.navbarItem.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Lien introuvable");
  await prisma.navbarItem.delete({ where: { id } });
}

// Full reordered id list in one transaction — reused verbatim by footer
// columns/links below, the first ordering primitive introduced in this schema.
export async function reorderNavbarItems(ids: string[]) {
  const count = await prisma.navbarItem.count({ where: { id: { in: ids } } });
  if (count !== ids.length) throw new HttpError(400, "Liste d'identifiants invalide");
  await prisma.$transaction(ids.map((id, index) => prisma.navbarItem.update({ where: { id }, data: { order: index } })));
  return listNavbarItems(false);
}

// ---------------------------------------------------------------------------
// Footer columns + links
// ---------------------------------------------------------------------------

export async function listFooterColumns() {
  return prisma.footerColumn.findMany({
    orderBy: { order: "asc" },
    include: { links: { orderBy: { order: "asc" } } },
  });
}

export async function createFooterColumn(title: string) {
  const maxOrder = await prisma.footerColumn.aggregate({ _max: { order: true } });
  return prisma.footerColumn.create({
    data: { title: title.trim(), order: (maxOrder._max.order ?? -1) + 1 },
    include: { links: true },
  });
}

export async function updateFooterColumn(id: string, title: string) {
  const existing = await prisma.footerColumn.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Colonne introuvable");
  return prisma.footerColumn.update({ where: { id }, data: { title: title.trim() }, include: { links: true } });
}

export async function deleteFooterColumn(id: string) {
  const existing = await prisma.footerColumn.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Colonne introuvable");
  await prisma.footerColumn.delete({ where: { id } });
}

export async function reorderFooterColumns(ids: string[]) {
  const count = await prisma.footerColumn.count({ where: { id: { in: ids } } });
  if (count !== ids.length) throw new HttpError(400, "Liste d'identifiants invalide");
  await prisma.$transaction(ids.map((id, index) => prisma.footerColumn.update({ where: { id }, data: { order: index } })));
  return listFooterColumns();
}

export interface FooterLinkInput {
  columnId: string;
  label: string;
  url: string;
}

export async function createFooterLink(input: FooterLinkInput) {
  const column = await prisma.footerColumn.findUnique({ where: { id: input.columnId } });
  if (!column) throw new HttpError(404, "Colonne introuvable");
  const maxOrder = await prisma.footerLink.aggregate({ _max: { order: true }, where: { columnId: input.columnId } });
  return prisma.footerLink.create({
    data: {
      columnId: input.columnId,
      label: input.label.trim(),
      url: input.url.trim(),
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
}

export interface UpdateFooterLinkInput {
  label?: string;
  url?: string;
}

export async function updateFooterLink(id: string, input: UpdateFooterLinkInput) {
  const existing = await prisma.footerLink.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Lien introuvable");
  return prisma.footerLink.update({
    where: { id },
    data: { label: input.label?.trim(), url: input.url?.trim() },
  });
}

export async function deleteFooterLink(id: string) {
  const existing = await prisma.footerLink.findUnique({ where: { id } });
  if (!existing) throw new HttpError(404, "Lien introuvable");
  await prisma.footerLink.delete({ where: { id } });
}

export async function reorderFooterLinks(columnId: string, ids: string[]) {
  const count = await prisma.footerLink.count({ where: { id: { in: ids }, columnId } });
  if (count !== ids.length) throw new HttpError(400, "Liste d'identifiants invalide");
  await prisma.$transaction(ids.map((id, index) => prisma.footerLink.update({ where: { id }, data: { order: index } })));
  return listFooterColumns();
}
