import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getNotificationSettings, saveNotificationSettings,
  defaultNotificationSettings, type NotificationSettings,
} from "@/lib/firestore";

export default function Notifications() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(defaultNotificationSettings);
  const { toast } = useToast();
  const { user } = useAuth();
  const uid = user?.uid || "dev";

  useEffect(() => {
    getNotificationSettings(uid)
      .then((data) => { if (data) setSettings(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [uid]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveNotificationSettings(uid, settings);
      toast({ title: "Notification settings saved!" });
    } catch { toast({ variant: "destructive", title: "Failed to save settings" }); }
    finally { setSaving(false); }
  };

  const toggle = (key: keyof NotificationSettings) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const setRadio = (group: string, value: string) => {
    if (group === "reminders1") {
      setSettings((p) => ({ ...p, remindersDoNotNotify: value === "doNot", remindersImportantOnly: value === "important", remindersAll: value === "all" }));
    } else if (group === "reminders2") {
      setSettings((p) => ({ ...p, reminders2DoNotNotify: value === "doNot", reminders2ImportantOnly: value === "important", reminders2All: value === "all" }));
    } else if (group === "activity") {
      setSettings((p) => ({ ...p, activityDoNotNotify: value === "doNot", activityAll: value === "all" }));
    }
  };

  const getRadioValue = (group: string): string => {
    if (group === "reminders1") return settings.remindersAll ? "all" : settings.remindersImportantOnly ? "important" : "doNot";
    if (group === "reminders2") return settings.reminders2All ? "all" : settings.reminders2ImportantOnly ? "important" : "doNot";
    return settings.activityAll ? "all" : "doNot";
  };

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Notifications" subtitle="Manage notification preferences" />
        <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader title="Notifications" subtitle="Manage notification preferences"
        actions={<Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>} />

      <div className="space-y-6 max-w-3xl">
        {/* Event Notifications */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Event Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><Label className="font-medium">New User Registration</Label><p className="text-sm text-muted-foreground">Get notified when a new user signs up</p></div>
              <Switch checked={settings.newUserRegistration} onCheckedChange={() => toggle("newUserRegistration")} />
            </div>
            <div className="flex items-center justify-between">
              <div><Label className="font-medium">Raffle Updates</Label><p className="text-sm text-muted-foreground">Notifications about raffle status changes</p></div>
              <Switch checked={settings.raffleUpdate} onCheckedChange={() => toggle("raffleUpdate")} />
            </div>
            <div className="flex items-center justify-between">
              <div><Label className="font-medium">Maintenance Updates</Label><p className="text-sm text-muted-foreground">System maintenance and downtime alerts</p></div>
              <Switch checked={settings.maintenanceUpdates} onCheckedChange={() => toggle("maintenanceUpdates")} />
            </div>
          </div>
        </Card>

        {/* Alert Frequency */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Alert Frequency</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><Label className="font-medium">User Alerts</Label><p className="text-sm text-muted-foreground">Frequent user activity notifications</p></div>
              <Switch checked={settings.user} onCheckedChange={() => toggle("user")} />
            </div>
            <div className="flex items-center justify-between">
              <div><Label className="font-medium">Raffle Alerts</Label><p className="text-sm text-muted-foreground">Raffle performance notifications</p></div>
              <Switch checked={settings.raffle} onCheckedChange={() => toggle("raffle")} />
            </div>
            <div className="flex items-center justify-between">
              <div><Label className="font-medium">Inventory Alerts</Label><p className="text-sm text-muted-foreground">Stock level and inventory notifications</p></div>
              <Switch checked={settings.inventory} onCheckedChange={() => toggle("inventory")} />
            </div>
          </div>
        </Card>

        {/* Reminders */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Reminders</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="font-medium mb-2 block">Reminder Group 1</Label>
              <RadioGroup value={getRadioValue("reminders1")} onValueChange={(v) => setRadio("reminders1", v)} className="space-y-2">
                <div className="flex items-center space-x-2"><RadioGroupItem value="doNot" id="r1-doNot" /><Label htmlFor="r1-doNot">Do not notify</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="important" id="r1-important" /><Label htmlFor="r1-important">Important only</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="r1-all" /><Label htmlFor="r1-all">All reminders</Label></div>
              </RadioGroup>
            </div>
            <div>
              <Label className="font-medium mb-2 block">Reminder Group 2</Label>
              <RadioGroup value={getRadioValue("reminders2")} onValueChange={(v) => setRadio("reminders2", v)} className="space-y-2">
                <div className="flex items-center space-x-2"><RadioGroupItem value="doNot" id="r2-doNot" /><Label htmlFor="r2-doNot">Do not notify</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="important" id="r2-important" /><Label htmlFor="r2-important">Important only</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="r2-all" /><Label htmlFor="r2-all">All reminders</Label></div>
              </RadioGroup>
            </div>
          </div>
        </Card>

        {/* Activity */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Activity Notifications</h3>
          <RadioGroup value={getRadioValue("activity")} onValueChange={(v) => setRadio("activity", v)} className="space-y-2">
            <div className="flex items-center space-x-2"><RadioGroupItem value="doNot" id="act-doNot" /><Label htmlFor="act-doNot">Do not notify</Label></div>
            <div className="flex items-center space-x-2"><RadioGroupItem value="all" id="act-all" /><Label htmlFor="act-all">All activity</Label></div>
          </RadioGroup>
        </Card>

        {/* Notification Method */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Notification Method</h3>
          <RadioGroup value={settings.notificationMethod} onValueChange={(v) => setSettings((p) => ({ ...p, notificationMethod: v as any }))} className="space-y-2">
            <div className="flex items-center space-x-2"><RadioGroupItem value="email" id="method-email" /><Label htmlFor="method-email">Email only</Label></div>
            <div className="flex items-center space-x-2"><RadioGroupItem value="inApp" id="method-inApp" /><Label htmlFor="method-inApp">In-app only</Label></div>
            <div className="flex items-center space-x-2"><RadioGroupItem value="both" id="method-both" /><Label htmlFor="method-both">Both email and in-app</Label></div>
          </RadioGroup>
        </Card>
      </div>
    </AppShell>
  );
}
