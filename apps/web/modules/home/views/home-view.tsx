"use client";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Icon } from "@calcom/ui/components/icon";
import Link from "next/link";
import { useEffect, useState } from "react";

type HomeViewProps = {
  userName: string;
  bookingPageSlug: string;
  sumOfBookings: number;
  sumOfEventTypes: number;
  sumOfTeamEventTypes: number;
};

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name} 👋`;
  if (hour < 17) return `Good afternoon, ${name} 👋`;
  return `Good evening, ${name} 👋`;
}

type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href?: string;
  accent?: string;
};

function StatCard({ label, value, icon, href, accent = "bg-indigo-50 dark:bg-indigo-950/30" }: StatCardProps) {
  const inner = (
    <div className="group flex flex-col gap-3 rounded-2xl border border-subtle bg-default p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>{icon}</div>
      <div>
        <p className="text-2xl font-semibold tracking-tight text-emphasis">{value}</p>
        <p className="mt-0.5 text-sm text-subtle">{label}</p>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

type AppointmentRowProps = {
  title: string;
  time: string;
  attendee: string;
  status: "confirmed" | "pending";
};

function AppointmentRow({ title, time, attendee, status }: AppointmentRowProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-subtle bg-default px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`h-2 w-2 rounded-full ${status === "confirmed" ? "bg-green-500" : "bg-amber-400"}`}
        />
        <div>
          <p className="text-sm font-medium text-emphasis">{title}</p>
          <p className="text-xs text-subtle">{attendee}</p>
        </div>
      </div>
      <span className="text-xs font-medium text-default">{time}</span>
    </div>
  );
}

type SetupItem = {
  label: string;
  href: string;
  done: boolean;
};

function SetupChecklist({ items }: { items: SetupItem[] }) {
  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="rounded-2xl border border-subtle bg-default p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-emphasis">Setup progress</h3>
        <span className="text-xs font-medium text-subtle">
          {done}/{total} done
        </span>
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-emphasis">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.done ? "#" : item.href}
              className="flex items-center gap-2.5 rounded-lg px-1 py-1 text-sm transition-colors hover:bg-subtle">
              <div
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                  item.done
                    ? "border-indigo-600 bg-indigo-600"
                    : "border-subtle bg-default"
                }`}>
                {item.done && <Icon name="check" className="h-3 w-3 text-white" />}
              </div>
              <span className={item.done ? "text-subtle line-through" : "text-default"}>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BookingLinkCard({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const bookingUrl = `${WEBAPP_URL}/${slug}`;

  const copy = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-subtle bg-default p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-emphasis">Your booking link</h3>
      <div className="flex items-center gap-2 rounded-xl border border-subtle bg-muted px-3 py-2.5">
        <Icon name="link" className="h-4 w-4 flex-shrink-0 text-subtle" />
        <span className="flex-1 truncate text-sm text-default">{bookingUrl}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700 active:bg-indigo-800">
          <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-xs text-subtle">Share this link so people can book time with you.</p>
    </div>
  );
}

export default function HomeView({
  userName,
  bookingPageSlug,
  sumOfBookings,
  sumOfEventTypes,
  sumOfTeamEventTypes,
}: HomeViewProps) {
  const { t } = useLocale();
  const [greeting, setGreeting] = useState("");

  // Derive greeting on client to avoid SSR mismatch
  useEffect(() => {
    setGreeting(getGreeting(userName));
  }, [userName]);

  const { data: unconfirmedCount = 0 } = trpc.viewer.me.bookingUnconfirmedCount.useQuery();

  const totalEventTypes = sumOfEventTypes + (sumOfTeamEventTypes ?? 0);

  const setupItems: SetupItem[] = [
    { label: "Create your first booking page", href: "/event-types/new", done: totalEventTypes > 0 },
    { label: "Connect your calendar", href: "/apps/installed/calendar", done: false },
    { label: "Set your availability", href: "/availability", done: false },
    { label: "Add payment method", href: "/apps/categories/payment", done: false },
    { label: "Share your booking link", href: `/${bookingPageSlug}`, done: sumOfBookings > 0 },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-emphasis sm:text-3xl">
          {greeting || `Welcome back, ${userName} 👋`}
        </h1>
        <p className="mt-1 text-sm text-subtle">Here&apos;s what&apos;s happening with your bookings today.</p>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Upcoming"
          value={unconfirmedCount}
          href="/bookings/upcoming"
          accent="bg-blue-50 dark:bg-blue-950/30"
          icon={<Icon name="calendar" className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
        />
        <StatCard
          label="Booking pages"
          value={totalEventTypes}
          href="/event-types"
          accent="bg-indigo-50 dark:bg-indigo-950/30"
          icon={<Icon name="link" className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />}
        />
        <StatCard
          label="Total bookings"
          value={sumOfBookings}
          href="/bookings"
          accent="bg-violet-50 dark:bg-violet-950/30"
          icon={<Icon name="calendar-check-2" className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
        />
        <StatCard
          label="Pending review"
          value={unconfirmedCount}
          href="/bookings/unconfirmed"
          accent="bg-amber-50 dark:bg-amber-950/30"
          icon={<Icon name="circle-alert" className="h-5 w-5 text-amber-500 dark:text-amber-400" />}
        />
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: appointments */}
        <div className="space-y-6 lg:col-span-2">
          {/* Today */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-emphasis">Today&apos;s appointments</h2>
              <Link href="/bookings/upcoming" className="text-xs font-medium text-indigo-600 hover:underline">
                View all
              </Link>
            </div>
            <TodayAppointments />
          </div>

          {/* This week */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-emphasis">This week</h2>
            </div>
            <ThisWeekSection />
          </div>
        </div>

        {/* Right: sidebar cards */}
        <div className="space-y-6">
          <SetupChecklist items={setupItems} />
          {bookingPageSlug && <BookingLinkCard slug={bookingPageSlug} />}
        </div>
      </div>
    </div>
  );
}

type BookingItem = RouterOutputs["viewer"]["bookings"]["get"]["bookings"][number];

function TodayAppointments() {
  const { data, isLoading } = trpc.viewer.bookings.get.useQuery(
    { filters: { status: "upcoming" }, limit: 5, offset: 0 },
    { staleTime: 60_000 }
  );

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayBookings = ((data?.bookings ?? []) as BookingItem[]).filter((b: BookingItem) => {
    const start = new Date(b.startTime);
    return start >= todayStart && start <= todayEnd;
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-subtle" />
        ))}
      </div>
    );
  }

  if (todayBookings.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-subtle bg-default px-5 py-6">
        <Icon name="calendar" className="h-5 w-5 text-subtle" />
        <p className="text-sm text-subtle">No appointments today. Enjoy the free time!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {todayBookings.map((b) => (
        <AppointmentRow
          key={b.uid}
          title={b.title}
          time={new Date(b.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          attendee={b.attendees?.[0]?.name ?? "Guest"}
          status={b.status === "accepted" ? "confirmed" : "pending"}
        />
      ))}
    </div>
  );
}

function ThisWeekSection() {
  const { data, isLoading } = trpc.viewer.bookings.get.useQuery(
    { filters: { status: "upcoming" }, limit: 10, offset: 0 },
    { staleTime: 60_000 }
  );

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekBookings = ((data?.bookings ?? []) as BookingItem[]).filter((b: BookingItem) => {
    const start = new Date(b.startTime);
    return start >= weekStart && start <= weekEnd;
  });

  if (isLoading) {
    return <div className="h-12 animate-pulse rounded-xl bg-subtle" />;
  }

  if (weekBookings.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-subtle bg-default px-5 py-5">
        <Icon name="calendar-days" className="h-5 w-5 text-subtle" />
        <p className="text-sm text-subtle">No bookings scheduled for this week.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {weekBookings.slice(0, 4).map((b) => {
        const start = new Date(b.startTime);
        return (
          <AppointmentRow
            key={b.uid}
            title={b.title}
            time={`${start.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} · ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            attendee={b.attendees?.[0]?.name ?? "Guest"}
            status={b.status === "accepted" ? "confirmed" : "pending"}
          />
        );
      })}
    </div>
  );
}
