import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, Save, Plus, Trash2, Megaphone, Clock } from "lucide-react";
import { toast } from "sonner";

interface Props {
  groupId: string;
  groupName: string;
}

interface Settings {
  notify_beneficiary_change: boolean;
  notify_split_assignment: boolean;
  beneficiary_template: string;
  split_template: string;
}

interface Reminder {
  id: string;
  title: string;
  message: string;
  day_of_month: number | null;
  is_active: boolean;
  last_sent_at: string | null;
}

const DEFAULT_SETTINGS: Settings = {
  notify_beneficiary_change: true,
  notify_split_assignment: true,
  beneficiary_template: "",
  split_template: "",
};

const GroupNotificationsPanel = ({ groupId, groupName }: Props) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newReminder, setNewReminder] = useState({ title: "", message: "", day_of_month: "" });

  useEffect(() => {
    void load();
  }, [groupId]);

  const load = async () => {
    setLoading(true);
    const [s, r] = await Promise.all([
      supabase.from("group_notification_settings" as any).select("*").eq("group_id", groupId).maybeSingle(),
      supabase.from("group_scheduled_reminders" as any).select("*").eq("group_id", groupId).order("created_at"),
    ]);
    if (s.data) {
      const d: any = s.data;
      setSettings({
        notify_beneficiary_change: d.notify_beneficiary_change,
        notify_split_assignment: d.notify_split_assignment,
        beneficiary_template: d.beneficiary_template || "",
        split_template: d.split_template || "",
      });
    }
    setReminders((r.data as any) || []);
    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase.from("group_notification_settings" as any).upsert(
      {
        group_id: groupId,
        notify_beneficiary_change: settings.notify_beneficiary_change,
        notify_split_assignment: settings.notify_split_assignment,
        beneficiary_template: settings.beneficiary_template || null,
        split_template: settings.split_template || null,
      },
      { onConflict: "group_id" },
    );
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error("Title and message required");
      return;
    }
    setBroadcasting(true);
    const { data: members, error: mErr } = await supabase
      .from("group_memberships")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("is_active", true);
    if (mErr || !members?.length) {
      setBroadcasting(false);
      toast.error("No active members in this group");
      return;
    }
    const rows = members.map((m) => ({
      user_id: m.user_id,
      title: broadcastTitle,
      message: broadcastMessage,
      type: "info",
      link: "/dashboard/contributor",
    }));
    const { error } = await supabase.from("notifications").insert(rows);
    setBroadcasting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Broadcast sent to ${members.length} member(s)`);
    setBroadcastTitle("");
    setBroadcastMessage("");
  };

  const addReminder = async () => {
    if (!newReminder.title.trim() || !newReminder.message.trim()) {
      toast.error("Title and message required");
      return;
    }
    const { error } = await supabase.from("group_scheduled_reminders" as any).insert({
      group_id: groupId,
      title: newReminder.title,
      message: newReminder.message,
      day_of_month: newReminder.day_of_month ? Number(newReminder.day_of_month) : null,
      is_active: true,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewReminder({ title: "", message: "", day_of_month: "" });
    toast.success("Reminder added");
    void load();
  };

  const deleteReminder = async (id: string) => {
    await supabase.from("group_scheduled_reminders" as any).delete().eq("id", id);
    toast.success("Reminder deleted");
    void load();
  };

  const toggleReminder = async (id: string, is_active: boolean) => {
    await supabase.from("group_scheduled_reminders" as any).update({ is_active }).eq("id", id);
    void load();
  };

  const sendReminderNow = async (r: Reminder) => {
    const { data: members } = await supabase
      .from("group_memberships")
      .select("user_id")
      .eq("group_id", groupId)
      .eq("is_active", true);
    if (!members?.length) {
      toast.error("No active members");
      return;
    }
    const rows = members.map((m) => ({
      user_id: m.user_id,
      title: r.title,
      message: r.message,
      type: "info",
      link: "/dashboard/contributor",
    }));
    const { error } = await supabase.from("notifications").insert(rows);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase
      .from("group_scheduled_reminders" as any)
      .update({ last_sent_at: new Date().toISOString() })
      .eq("id", r.id);
    toast.success(`Reminder sent to ${members.length} member(s)`);
    void load();
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      {/* Toggles + templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-contribution" />
            Automatic notifications
          </CardTitle>
          <CardDescription>
            Control which automated alerts members in <b>{groupName}</b> receive, and customise the wording.
            Placeholders: <code>{"{name}"}</code>, <code>{"{month}"}</code>, <code>{"{amount}"}</code>,{" "}
            <code>{"{group}"}</code>, <code>{"{bank}"}</code>, <code>{"{account}"}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Beneficiary changes</Label>
              <p className="text-xs text-muted-foreground">
                Notify when a monthly beneficiary is assigned or updated.
              </p>
            </div>
            <Switch
              checked={settings.notify_beneficiary_change}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, notify_beneficiary_change: v }))}
            />
          </div>
          <Textarea
            placeholder="Default: {name} is the beneficiary for {month} • Bank: {bank} • Acct: {account}"
            value={settings.beneficiary_template}
            onChange={(e) => setSettings((s) => ({ ...s, beneficiary_template: e.target.value }))}
            rows={2}
            disabled={!settings.notify_beneficiary_change}
          />

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Split contribution assignments</Label>
              <p className="text-xs text-muted-foreground">Notify a member when they receive a split slot.</p>
            </div>
            <Switch
              checked={settings.notify_split_assignment}
              onCheckedChange={(v) => setSettings((s) => ({ ...s, notify_split_assignment: v }))}
            />
          </div>
          <Textarea
            placeholder="Default: You have been assigned a £{amount} split for {month} in {group}."
            value={settings.split_template}
            onChange={(e) => setSettings((s) => ({ ...s, split_template: e.target.value }))}
            rows={2}
            disabled={!settings.notify_split_assignment}
          />

          <Button onClick={saveSettings} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving…" : "Save settings"}
          </Button>
        </CardContent>
      </Card>

      {/* Broadcast */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-contribution" />
            Send a broadcast now
          </CardTitle>
          <CardDescription>Sends an instant notification to every active member of this group.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Title (e.g. Reminder: pay before Friday)"
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
          />
          <Textarea
            placeholder="Message body…"
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            rows={3}
          />
          <Button onClick={sendBroadcast} disabled={broadcasting} variant="contribution" className="w-full">
            <Send className="w-4 h-4 mr-2" />
            {broadcasting ? "Sending…" : "Send to all members"}
          </Button>
        </CardContent>
      </Card>

      {/* Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-contribution" />
            Reminder presets
          </CardTitle>
          <CardDescription>
            Save reminder templates and send them with one click whenever needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
            <Input
              placeholder="Reminder title"
              value={newReminder.title}
              onChange={(e) => setNewReminder((r) => ({ ...r, title: e.target.value }))}
            />
            <Textarea
              placeholder="Reminder message"
              value={newReminder.message}
              onChange={(e) => setNewReminder((r) => ({ ...r, message: e.target.value }))}
              rows={2}
            />
            <Input
              type="number"
              min={1}
              max={31}
              placeholder="Day of month (optional, for reference)"
              value={newReminder.day_of_month}
              onChange={(e) => setNewReminder((r) => ({ ...r, day_of_month: e.target.value }))}
            />
            <Button onClick={addReminder} variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add reminder preset
            </Button>
          </div>

          {reminders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No reminder presets yet.</p>
          ) : (
            <div className="space-y-2">
              {reminders.map((r) => (
                <div key={r.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{r.title}</p>
                        {r.day_of_month && <Badge variant="outline">Day {r.day_of_month}</Badge>}
                        {!r.is_active && <Badge variant="secondary">Disabled</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{r.message}</p>
                      {r.last_sent_at && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Last sent: {new Date(r.last_sent_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={(v) => toggleReminder(r.id, v)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="contribution"
                      className="flex-1"
                      disabled={!r.is_active}
                      onClick={() => sendReminderNow(r)}
                    >
                      <Send className="w-3 h-3 mr-1" />
                      Send now
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteReminder(r.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GroupNotificationsPanel;
