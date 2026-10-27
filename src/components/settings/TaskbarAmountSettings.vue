<script setup lang="ts">
// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md
import { useId } from "vue";
import { useI18n } from "../../composables/useI18n";
import { useTaskbarAmountControls } from "../../lib/taskbar-amount-context";
import SettingsGroup from "../ui/SettingsGroup.vue";
import SwitchRow from "../ui/SwitchRow.vue";
import {
  minTaskbarOffset,
  maxTaskbarOffset,
  normalizeTaskbarOffset,
} from "../../lib/taskbar-offset";

const controls = useTaskbarAmountControls();
const { t } = useI18n();
const offsetId = `taskbar-offset-${useId()}`;
const updateOffset = (event: Event) => {
  const input = event.target as HTMLInputElement;
  // Keep intermediate input (e.g. a lone minus sign) intact while typing.
  if (controls && Number.isFinite(input.valueAsNumber)) {
    controls.offset.value = normalizeTaskbarOffset(input.valueAsNumber);
  }
};
const finishOffset = (event: FocusEvent) => {
  if (controls) (event.target as HTMLInputElement).value = String(controls.offset.value);
};
</script>

<template>
  <SettingsGroup v-if="controls" :title="t('settings.taskbarAmount')">
    <template #action>
      <SwitchRow
        :label="t('settings.taskbarEnable')"
        title-action
        :model-value="controls.enabled.value"
        @update:model-value="controls.enabled.value = $event"
      />
    </template>
    <div class="taskbar-settings">
      <p>{{ t("settings.taskbarHint") }}</p>
      <template v-if="controls.enabled.value">
        <label :for="offsetId">
          <span>{{ t("settings.taskbarOffset") }}</span>
          <input
            :id="offsetId"
            type="number"
            :min="minTaskbarOffset"
            :max="maxTaskbarOffset"
            step="1"
            :aria-describedby="`${offsetId}-hint`"
            :value="controls.offset.value"
            @input="updateOffset"
            @blur="finishOffset"
          />
        </label>
        <p :id="`${offsetId}-hint`">{{ t("settings.taskbarOffsetHint") }}</p>
        <button
          type="button"
          :disabled="controls.busy.value"
          @click="controls.hideWindow()"
        >
          {{ t("settings.taskbarOnly") }}
        </button>
        <p v-if="controls.error.value" class="taskbar-error" role="status">
          {{ t("settings.taskbarError") }} {{ controls.error.value }}
        </p>
      </template>
    </div>
  </SettingsGroup>
</template>

<style scoped>
.taskbar-settings {
  display: grid;
  gap: 10px;
}
.taskbar-settings p {
  margin: 0;
  color: var(--muted);
  font-size: var(--ui-font-xs, 12px);
  line-height: 1.5;
}
.taskbar-settings label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--muted);
  font-size: var(--ui-font-sm, 14px);
}
.taskbar-settings input {
  width: 90px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 7px 9px;
  background: var(--panel);
  color: var(--text);
  font: inherit;
}
.taskbar-settings button {
  justify-self: start;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 9px 12px;
  background: var(--panel);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}
.taskbar-settings button:focus-visible,
.taskbar-settings input:focus-visible {
  outline: 2px solid var(--field-focus-border);
  outline-offset: 2px;
}
.taskbar-settings .taskbar-error {
  color: var(--danger);
}
</style>
