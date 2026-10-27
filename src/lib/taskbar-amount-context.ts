// SPDX-FileCopyrightText: 2026 Mr.Baoboer
// SPDX-License-Identifier: AGPL-3.0-only
//
// Additional terms: see /legal/ADDITIONAL_TERMS.md

import { inject, type InjectionKey, type Ref } from "vue";

export type TaskbarAmountControls = {
  enabled: Ref<boolean>;
  offset: Ref<number>;
  error: Ref<string>;
  busy: Ref<boolean>;
  hideWindow: () => Promise<void>;
};

export const taskbarAmountKey: InjectionKey<TaskbarAmountControls> =
  Symbol("taskbar-amount");
export const useTaskbarAmountControls = () => inject(taskbarAmountKey, null);
