import type { PasswordComplexity, Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { HttpError } from "../../middleware/errorHandler.js";

export async function getOrCreateConfig() {
  return prisma.systemConfig.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
}

export interface UpdateConfigInput {
  platformName?: string;
  contactEmail?: string;
  supportUrl?: string;
  maintenanceMode?: boolean;
  // Only meaningful when maintenanceMode is being turned on; the end timestamp is
  // always computed server-side from this so a client can't set an arbitrary date.
  maintenanceDurationHours?: number;
  autoTriage?: boolean;
  enterpriseValidation?: boolean;
  triageLimitHours?: number;
  aiSensitivity?: number;
  require2FA?: boolean;
  ipWhitelisting?: boolean;
  sessionTimeout?: number;
  passwordComplexity?: PasswordComplexity;
  globalNotificationsEnabled?: boolean;
}

export async function updateConfig(input: UpdateConfigInput) {
  await getOrCreateConfig();
  const { maintenanceDurationHours, ...body } = input;
  const data: Prisma.SystemConfigUpdateInput = { ...body };

  if (body.maintenanceMode === true) {
    if (!maintenanceDurationHours) {
      throw new HttpError(400, "Durée de maintenance requise (1 à 24 heures)");
    }
    data.maintenanceUntil = new Date(Date.now() + maintenanceDurationHours * 60 * 60 * 1000);
  } else if (body.maintenanceMode === false) {
    data.maintenanceUntil = null;
  }

  return prisma.systemConfig.update({ where: { id: 1 }, data });
}
