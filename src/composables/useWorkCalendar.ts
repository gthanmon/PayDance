// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";
import type { SalaryConfig } from "../lib/salary";
import {
  ensureCalendarForDate,
  monthWorkCalendar,
  refreshHolidayYear,
} from "../lib/work-calendar";

export function useWorkCalendar(config: Readonly<Ref<SalaryConfig>>) {
  const now = ref(new Date());
  const updating = ref(false);
  const updateFailed = ref(false);
  let timer: ReturnType<typeof setInterval> | undefined;
  const month = computed(() => monthWorkCalendar(now.value, config.value));
  watch(
    [() => config.value.calendarMode, () => now.value.getFullYear()],
    () => {
      ensureCalendarForDate(now.value, config.value);
    },
    { immediate: true },
  );
  onMounted(() => {
    timer = setInterval(() => {
      now.value = new Date();
    }, 30_000);
  });
  onBeforeUnmount(() => clearInterval(timer));
  const refresh = async () => {
    updating.value = true;
    updateFailed.value = false;
    try {
      updateFailed.value = !(await refreshHolidayYear(now.value.getFullYear(), true));
    } finally {
      updating.value = false;
    }
  };
  return { now, month, updating, updateFailed, refresh };
}
