import { Save } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useProfileForm } from "./parametres/useProfileForm";
import { useNotificationPreferences } from "./parametres/useNotificationPreferences";
import { usePaymentConfig } from "./parametres/usePaymentConfig";
import { ProfileSection } from "./parametres/ProfileSection";
import { NotificationsSection } from "./parametres/NotificationsSection";
import { PaymentSection } from "./parametres/PaymentSection";
import { PayoutPreferences } from "./parametres/PayoutPreferences";

export default function HackerParametres() {
  const profileForm = useProfileForm();
  const notifications = useNotificationPreferences();
  const payment = usePaymentConfig();

  return (
    <DashboardLayout>
      <div className="space-y-8 w-full pb-12">
        <h1 className="text-3xl font-black text-foreground tracking-tighter">Paramètres du Compte</h1>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
          <div className="space-y-8">
            <ProfileSection
              profileName={profileForm.profileName}
              setProfileName={profileForm.setProfileName}
              profileEmail={profileForm.profileEmail}
              setProfileEmail={profileForm.setProfileEmail}
              profileAvatar={profileForm.profileAvatar}
              onAvatarChange={profileForm.handleAvatarChange}
              onSave={profileForm.saveProfile}
            />

            <NotificationsSection
              preferences={notifications.notificationPreferences}
              setPreference={notifications.setNotificationPreference}
              onSave={notifications.saveNotificationPreferences}
              onSendTest={notifications.sendTestNotification}
            />
          </div>

          <div className="space-y-8">
            <PaymentSection
              config={payment.config}
              setField={payment.setField}
              togglePaymentMethod={payment.togglePaymentMethod}
              validations={payment.validations}
            />

            <PayoutPreferences config={payment.config} setField={payment.setField} />

            <div className="flex justify-end pt-8 md:col-span-2">
              <Button onClick={payment.handleSave} className="h-12 px-12 bg-primary text-primary-foreground font-black text-lg rounded-2xl shadow-2xl shadow-primary/30 w-full sm:w-auto">
                <Save className="w-4 h-4 mr-2" />
                ENREGISTRER TOUS LES PARAMÈTRES
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
