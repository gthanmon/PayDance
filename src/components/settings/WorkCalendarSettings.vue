<script setup lang="ts">
// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md
import { computed, toRef, useId } from "vue";
import type { SalaryConfig, WorkSchedule } from "../../lib/salary";
import {
  getHolidayYear,
  isSingleRestWeek,
  localDateKey,
  weekMonday,
} from "../../lib/work-calendar";
import { createWeekdayOptions } from "../../lib/settings-form";
import { useWorkCalendar } from "../../composables/useWorkCalendar";
import { useI18n } from "../../composables/useI18n";
import { openExternalUrl } from "#opener";
import holidayLicense from "../../lib/work-calendar/data/LICENSE?raw";
import SegmentedControl from "../ui/SegmentedControl.vue";
import WorkdayPicker from "./WorkdayPicker.vue";

const props = defineProps<{ config: SalaryConfig; invalid?: boolean }>();
const emit = defineEmits<{ "update:config": [config: SalaryConfig] }>();
const { t } = useI18n();
const id = useId();
const { now, month, updating, updateFailed, refresh } = useWorkCalendar(
  toRef(props, "config"),
);
const automatic = computed(() => props.config.calendarMode === "china");
const modes = computed(() => [
  { value: "manual", label: t.value("calendar.manual") },
  { value: "china", label: t.value("calendar.automatic") },
]);
const schedules = computed(() => [
  { value: "double", label: t.value("calendar.double") },
  { value: "single", label: t.value("calendar.single") },
  { value: "alternating", label: t.value("calendar.alternating") },
]);
const phase = computed(() =>
  isSingleRestWeek(now.value, props.config) ? "single" : "double",
);
const source = computed(() => getHolidayYear(month.value.year)?.papers[0]);
const leadingDays = computed(
  () => (new Date(month.value.year, month.value.month - 1, 1).getDay() + 6) % 7,
);
const update = (value: Partial<SalaryConfig>) =>
  emit("update:config", { ...props.config, ...value });
const changeSchedule = (value: string) =>
  update({
    workSchedule: value as WorkSchedule,
    ...(value === "alternating" && !props.config.alternatingWeekAnchor
      ? {
          alternatingWeekAnchor: localDateKey(weekMonday(now.value)),
          alternatingAnchorIsSingle: false,
        }
      : {}),
  });
const changePhase = (event: Event) =>
  update({
    alternatingWeekAnchor: localDateKey(weekMonday(now.value)),
    alternatingAnchorIsSingle: (event.target as HTMLSelectElement).value === "single",
  });
</script>

<template>
  <div class="work-calendar">
    <SegmentedControl
      :columns="2"
      :label="t('calendar.mode')"
      :options="modes"
      :model-value="config.calendarMode ?? 'manual'"
      @update:model-value="update({ calendarMode: $event as 'manual' | 'china' })"
    />
    <WorkdayPicker
      v-if="!automatic"
      density="settings"
      :invalid="invalid"
      :workdays="config.workdays"
      @update:workdays="update({ workdays: $event })"
    />
    <template v-else>
      <SegmentedControl
        :columns="3"
        :label="t('calendar.schedule')"
        :options="schedules"
        :model-value="config.workSchedule ?? 'double'"
        @update:model-value="changeSchedule"
      />
      <label
        v-if="config.workSchedule === 'single'"
        class="calendar-select"
        :for="`${id}-rest`"
      >
        <span>{{ t("calendar.restDay") }}</span>
        <select
          :id="`${id}-rest`"
          :value="config.weeklyRestDay ?? 0"
          @change="
            update({ weeklyRestDay: Number(($event.target as HTMLSelectElement).value) })
          "
        >
          <option
            v-for="day in createWeekdayOptions(t)"
            :key="day.value"
            :value="day.value"
          >
            {{ t("calendar.weekday", { day: day.label }) }}
          </option>
        </select>
      </label>
      <label
        v-if="config.workSchedule === 'alternating'"
        class="calendar-select"
        :for="`${id}-phase`"
      >
        <span>{{ t("calendar.thisWeek") }}</span>
        <select :id="`${id}-phase`" :value="phase" @change="changePhase">
          <option value="double">{{ t("calendar.thisDouble") }}</option>
          <option value="single">{{ t("calendar.thisSingle") }}</option>
        </select>
      </label>
      <p v-if="config.workSchedule === 'alternating'" class="calendar-hint">
        {{ t("calendar.alternatingHint") }}
      </p>
      <div
        class="calendar-summary"
        :class="{ 'is-estimate': !month.confirmed }"
        role="status"
      >
        <div>
          <span>{{ t("calendar.month", { year: month.year, month: month.month }) }}</span>
          <strong
            >{{ month.workDays }}<small>{{ t("salaryAmount.unitDays") }}</small></strong
          >
        </div>
        <p>{{ t(month.confirmed ? "calendar.confirmed" : "calendar.estimated") }}</p>
        <p v-if="month.confirmed">
          {{
            t("calendar.breakdown", {
              holidays: month.holidays,
              makeup: month.makeupDays,
            })
          }}
        </p>
      </div>
      <p class="calendar-hint">{{ t("calendar.rule") }}</p>
      <p class="calendar-hint">{{ t("calendar.rateHint") }}</p>
      <details class="calendar-details">
        <summary>{{ t("calendar.preview") }}</summary>
        <div class="month-grid">
          <span v-for="day in createWeekdayOptions(t)" :key="day.value" class="weekday">{{
            day.label
          }}</span>
          <span v-for="day in leadingDays" :key="`blank-${day}`" aria-hidden="true" />
          <span
            v-for="day in month.days"
            :key="day.date"
            class="month-day"
            :class="{
              'is-rest': !day.working,
              'is-makeup': day.kind === 'makeup',
              'is-holiday': day.kind === 'holiday',
              'is-today': day.date === localDateKey(now),
            }"
            :aria-label="`${day.date} ${day.name} ${t(day.working ? 'calendar.work' : 'calendar.rest')}`"
            :title="`${day.date} ${day.name} ${t(day.working ? 'calendar.work' : 'calendar.rest')}`"
          >
            {{ Number(day.date.slice(8)) }}
            <small v-if="day.kind !== 'regular'">{{
              t(day.kind === "makeup" ? "calendar.makeup" : "calendar.rest")
            }}</small>
          </span>
        </div>
      </details>
      <div class="calendar-footer">
        <span>{{ t("calendar.offline") }}</span>
        <button type="button" :disabled="updating" @click="refresh">
          {{ t(updating ? "calendar.updating" : "calendar.refresh") }}
        </button>
      </div>
      <p v-if="updateFailed" class="calendar-hint" role="status">
        {{ t(month.confirmed ? "calendar.cachedAfterFailure" : "calendar.unavailable") }}
      </p>
      <details class="calendar-license">
        <summary>{{ t("calendar.source") }}</summary>
        <a v-if="source" :href="source" @click.prevent="openExternalUrl(source)">{{
          t("calendar.officialNotice")
        }}</a>
        <p>holiday-cn · Copyright (c) 2019 NateScarlet · MIT</p>
        <pre>{{ holidayLicense }}</pre>
      </details>
    </template>
  </div>
</template>

<style scoped>
.work-calendar {
  display: grid;
  gap: 11px;
  min-width: 0;
}
.calendar-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--muted);
  font-size: var(--ui-font-sm, 14px);
}
.calendar-select select {
  max-width: 60%;
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 8px 10px;
  color: var(--text);
  background: var(--panel);
  font: inherit;
}
.calendar-summary {
  padding: 13px 15px;
  border: 1px solid var(--income-accent-ring);
  border-radius: 12px;
  background: var(--income-accent-glow);
}
.calendar-summary > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--text);
  font-size: 14px;
}
.calendar-summary strong {
  font-size: 28px;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.calendar-summary small {
  margin-left: 5px;
  font-size: 12px;
  font-weight: 500;
}
.calendar-summary p,
.calendar-hint,
.calendar-license {
  margin: 0;
  color: var(--muted);
  font-size: var(--ui-font-xs, 12px);
  line-height: 1.6;
}
.calendar-summary p {
  margin-top: 4px;
}
.calendar-summary.is-estimate {
  border-color: rgb(245 158 11 / 0.45);
  background: rgb(245 158 11 / 0.1);
}
.calendar-details summary,
.calendar-license summary {
  cursor: pointer;
  color: var(--muted);
  font-size: 12px;
}
.month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 5px;
  padding-top: 12px;
}
.weekday {
  text-align: center;
  color: var(--muted);
  font-size: 11px;
}
.month-day {
  position: relative;
  display: grid;
  align-content: center;
  min-height: 36px;
  padding: 4px 0;
  text-align: center;
  border-radius: 7px;
  background: var(--panel-soft);
  color: var(--text);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.month-day small {
  font-size: 9px;
  line-height: 1.2;
}
.month-day.is-rest {
  color: var(--muted);
  opacity: 0.7;
}
.month-day.is-holiday {
  background: rgb(245 158 11 / 0.1);
  opacity: 1;
}
.month-day.is-makeup {
  background: var(--income-accent-glow);
}
.month-day.is-today {
  outline: 1px solid var(--income-accent-ring);
}
.calendar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: var(--muted);
}
.calendar-footer button {
  flex-shrink: 0;
  border: 1px solid var(--line);
  border-radius: 7px;
  padding: 5px 8px;
  color: var(--text);
  background: var(--panel);
}
.calendar-footer button:disabled {
  opacity: 0.55;
}
.calendar-license a {
  display: inline-block;
  margin-top: 7px;
  text-decoration: underline;
}
.calendar-license pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 10px;
}
select:focus-visible,
button:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--field-focus-border);
  outline-offset: 2px;
}
</style>
