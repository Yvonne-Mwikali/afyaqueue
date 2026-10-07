import { useRouter } from "expo-router";
import { Typography } from "heroui-native";
import type { JSX } from "react";
import { View } from "react-native";

import { AdminCard } from "@/components/admin/admin-ui";
import { Screen } from "@/components/ui/screen";
import { ScreenHeader } from "@/components/ui/screen-header";
import { textRole } from "@/design-system";
import {
  useAdminDoctors,
  useAdminHospital,
  useAdminInvites,
  useAdminLinks,
  useAdminMembers,
  useAdminServices,
} from "@/features/admin/use-admin";
import { queueCounts } from "@/features/staff/staff-view";
import {
  useQueueEntriesFor,
  useTodayQueues,
  useTodayVisits,
} from "@/features/staff/use-staff-queues";

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/** Hospital Admin home: today at a glance, then the six management areas. */
export default function AdminHomeRoute(): JSX.Element {
  const router = useRouter();
  const hospital = useAdminHospital();
  const members = useAdminMembers();
  const invites = useAdminInvites();
  const doctors = useAdminDoctors();
  const services = useAdminServices();
  const links = useAdminLinks();
  const visits = useTodayVisits();
  const queues = useTodayQueues();
  const entries = useQueueEntriesFor(queues.data.map((q) => q.id));
  const counts = queueCounts(entries.data);

  const team = members.data.filter((m) => m.active);
  const pending = invites.data.filter((i) => i.status === "pending").length;
  const activeDoctors = doctors.data.filter((d) => d.active);
  const unscheduled = activeDoctors.filter(
    (d) => !links.data.some((l) => l.doctorId === d.id && l.active)
  ).length;

  const today: [string, number][] = [
    ["Appointments", visits.data.length],
    ["Waiting", counts.waiting + counts.called + counts.held],
    ["In service", counts.inService],
  ];

  return (
    <Screen header={<ScreenHeader title="Hospital Admin" onBack={() => router.back()} />}>
      <View className="gap-1">
        <Typography
          type={textRole.eyebrow.type}
          weight={textRole.eyebrow.weight}
          className={`text-brand-text ${textRole.eyebrow.className}`}
        >
          Hospital Admin
        </Typography>
        <Typography type={textRole.pageTitle.type} weight={textRole.pageTitle.weight}>
          {hospital.data?.name ?? " "}
        </Typography>
      </View>

      <View className="flex-row rounded-3xl bg-linear-to-r from-hero-from to-hero-to px-2 py-3">
        {today.map(([label, value]) => (
          <View
            key={label}
            className="flex-1 items-center"
            accessible
            accessibilityLabel={`${value} ${label} today`}
          >
            <Typography type={textRole.metric.type} weight={textRole.metric.weight}>
              {value}
            </Typography>
            <Typography type={textRole.caption.type} color="muted">
              {label}
            </Typography>
          </View>
        ))}
      </View>

      <View className="gap-2.5">
        <AdminCard
          icon="account-group-outline"
          title="Team"
          count={`${plural(team.length, "member")}${pending ? ` · ${pending} invited` : ""}`}
          description="Invite people and manage access and roles"
          onPress={() => router.push("/admin/team")}
        />
        <AdminCard
          icon="doctor"
          title="Doctors"
          count={plural(activeDoctors.length, "active doctor")}
          description="Add doctors, services, accounts and time off"
          onPress={() => router.push("/admin/doctors")}
        />
        <AdminCard
          icon="medical-bag"
          title="Services"
          count={plural(services.data.filter((s) => s.active).length, "active service")}
          description="Create services, durations and who provides them"
          onPress={() => router.push("/admin/services")}
        />
        <AdminCard
          icon="calendar-clock-outline"
          title="Schedules"
          count={
            unscheduled
              ? `${plural(unscheduled, "doctor")} without services`
              : "Weekly hours per doctor"
          }
          description="Set weekly hours from each doctor's page"
          onPress={() => router.push("/admin/doctors")}
        />
        <AdminCard
          icon="hospital-building"
          title="Hospital"
          {...(hospital.data?.location ? { count: hospital.data.location } : {})}
          description="Name, location and time zone"
          onPress={() => router.push("/admin/hospital")}
        />
        <AdminCard
          icon="history"
          title="Audit"
          description="Who called, held, started and completed visits"
          onPress={() => router.push("/admin/audit")}
        />
      </View>
    </Screen>
  );
}
