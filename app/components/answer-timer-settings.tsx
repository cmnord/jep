import clsx from "clsx";
import * as React from "react";
import { useFetcher } from "react-router";

import Button from "~/components/button";
import Dialog from "~/components/dialog";
import type { RoomProps } from "~/components/game";
import type { Action } from "~/engine";
import { GameState, useEngineContext } from "~/engine";
import { ANSWER_TIME_OPTIONS } from "~/engine/answer-timer";
import {
  BUZZ_WINDOW_OPTIONS,
  FINAL_ANSWER_TIME_OPTIONS,
  READ_TIME_OPTIONS,
  WAGER_TIME_OPTIONS,
} from "~/engine/room-timers";
import { useTranslation } from "~/i18n";
import {
  READ_TIME_AUTO,
  type RoomSettingsValues,
  toSettingsFormData,
} from "~/utils/room-timers-form";
import useSoloAction from "~/utils/use-solo-action";

const TIMER_SYMBOL = "⏱"; // ⏱

export interface SettingsAccessProps {
  /** The visitor is logged in as the site admin (room loader). */
  isAdmin?: boolean;
  /** The visitor holds the room's host seat (feature 22). */
  isHost?: boolean;
}

/** mayEditSettings: in a room only the site admin (or the room's host) may
 * change the settings (the server enforces it too); in solo play (room -1)
 * the player may. */
export function mayEditSettings(
  roomId: number,
  isAdmin = false,
  isHost = false,
) {
  return isAdmin || isHost || roomId === -1;
}

/** settingsFromFormData reads the values a pending settings request sends
 * (so a change shows right away while it is being saved). */
function settingsFromFormData(
  formData: FormData,
  current: RoomSettingsValues,
): RoomSettingsValues {
  const num = (name: string, fallback: number) => {
    const value = formData.get(name);
    return value === null ? fallback : Number(value);
  };
  const read = formData.get("readTimeSec");
  return {
    answerTimeSec: num("answerTimeSec", current.answerTimeSec),
    autoWrongOnTimeout: formData.get("autoWrongOnTimeout") === "true",
    readTimeSec:
      read === null
        ? current.readTimeSec
        : read === READ_TIME_AUTO
          ? null
          : Number(read),
    buzzWindowSec: num("buzzWindowSec", current.buzzWindowSec),
    finalAnswerTimeSec: num("finalAnswerTimeSec", current.finalAnswerTimeSec),
    wagerTimeSec: num("wagerTimeSec", current.wagerTimeSec),
  };
}

/** useRoomSettings is the room's settings (answer timer and room timers,
 * showing a change right away while it is being saved) and a function to
 * change them. The admin (or the solo player) can change them between
 * questions. */
function useRoomSettings({
  roomId,
  userId,
  isAdmin,
  isHost = false,
}: RoomProps & SettingsAccessProps) {
  const {
    activeClue,
    answerTimeSec,
    autoWrongOnTimeout,
    readTimeSec,
    buzzWindowSec,
    finalAnswerTimeSec,
    wagerTimeSec,
    players,
    soloDispatch,
    type,
  } = useEngineContext();
  const fetcher = useFetcher<Action>();
  useSoloAction(fetcher, soloDispatch);

  const current: RoomSettingsValues = {
    answerTimeSec,
    autoWrongOnTimeout,
    readTimeSec,
    buzzWindowSec,
    finalAnswerTimeSec,
    wagerTimeSec,
  };
  const pending = fetcher.formData;
  const values = pending ? settingsFromFormData(pending, current) : current;

  const editable = mayEditSettings(roomId, isAdmin, isHost);
  const betweenQuestions = activeClue === null && type !== GameState.GameOver;
  const canChange =
    editable &&
    betweenQuestions &&
    // The admin and the host needn't play; in solo play the player sets it.
    (isAdmin || isHost || players.has(userId));

  const save = (next: RoomSettingsValues) =>
    fetcher.submit(
      {
        userId,
        ...toSettingsFormData(next),
        // The host's change (the server checks the seat).
        ...(isHost && !isAdmin ? { host: "true" } : {}),
      },
      { method: "post", action: `/room/${roomId}/settings` },
    );

  return { values, editable, canChange, save };
}

/** ChoiceGroup is a row of radio "chips" (one value of a setting). */
function ChoiceGroup<T extends number | null>({
  label,
  options,
  value,
  format,
  disabled,
  onSelect,
  testId,
  help,
}: {
  label: string;
  options: readonly T[];
  value: T;
  format: (option: T) => string;
  disabled: boolean;
  onSelect: (option: T) => void;
  testId: string;
  help?: string;
}) {
  const labelId = React.useId();
  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
      <span id={labelId} className="text-sm text-white opacity-70">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex flex-wrap gap-1"
      >
        {options.map((option) => {
          const selected = option === value;
          return (
            <button
              key={String(option)}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => {
                if (!selected) onSelect(option);
              }}
              className={clsx(
                "min-w-12 rounded-lg border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                selected
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-white/20 bg-white/10 text-slate-300 hover:bg-blue-600/20",
              )}
            >
              {format(option)}
            </button>
          );
        })}
      </div>
      {help ? <p className="text-xs text-slate-400">{help}</p> : null}
    </div>
  );
}

/** RoomTimersFields is the "Room timers" panel: answer time (+ marking wrong
 * when it runs out), reading time, buzz window, Final answer time and wager
 * time. Used in the admin's "new room" step, the round preview and the ⏱
 * sheet. `disabled` shows the values read-only. */
export function RoomTimersFields({
  values,
  onChange,
  disabled,
}: {
  values: RoomSettingsValues;
  onChange: (next: RoomSettingsValues) => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const seconds = (s: number) => t("room.answerTimeSeconds", { seconds: s });
  const set = (patch: Partial<RoomSettingsValues>) =>
    onChange({ ...values, ...patch });

  return (
    <div className="flex flex-col gap-4" data-testid="room-timers">
      <div className="flex flex-col gap-2" data-testid="answer-timer-settings">
        <ChoiceGroup<number>
          label={t("room.answerTime")}
          options={ANSWER_TIME_OPTIONS}
          value={values.answerTimeSec}
          format={(s) => (s === 0 ? t("room.answerTimeOff") : seconds(s))}
          disabled={disabled}
          onSelect={(answerTimeSec) => set({ answerTimeSec })}
          testId="answer-time-options"
        />
        <label
          className={clsx(
            "flex items-center gap-2 text-sm text-slate-300",
            values.answerTimeSec === 0 && "opacity-50",
          )}
        >
          <input
            type="checkbox"
            className="h-4 w-4 accent-blue-600"
            checked={values.autoWrongOnTimeout}
            disabled={disabled || values.answerTimeSec === 0}
            onChange={(e) => set({ autoWrongOnTimeout: e.target.checked })}
          />
          {t("room.answerTimeAutoWrong")}
        </label>
      </div>
      <ChoiceGroup<number | null>
        label={t("room.timers.readTime")}
        options={READ_TIME_OPTIONS}
        value={values.readTimeSec}
        format={(s) => (s === null ? t("room.timers.auto") : seconds(s))}
        disabled={disabled}
        onSelect={(readTimeSec) => set({ readTimeSec })}
        testId="read-time-settings"
        help={t("room.timers.readTimeHelp")}
      />
      <ChoiceGroup<number>
        label={t("room.timers.buzzWindow")}
        options={BUZZ_WINDOW_OPTIONS}
        value={values.buzzWindowSec}
        format={seconds}
        disabled={disabled}
        onSelect={(buzzWindowSec) => set({ buzzWindowSec })}
        testId="buzz-window-settings"
      />
      <ChoiceGroup<number>
        label={t("room.timers.finalAnswerTime")}
        options={FINAL_ANSWER_TIME_OPTIONS}
        value={values.finalAnswerTimeSec}
        format={(s) => (s === 0 ? t("room.timers.noLimit") : seconds(s))}
        disabled={disabled}
        onSelect={(finalAnswerTimeSec) => set({ finalAnswerTimeSec })}
        testId="final-answer-time-settings"
        help={t("room.timers.finalAnswerTimeHelp")}
      />
      <ChoiceGroup<number>
        label={t("room.timers.wagerTime")}
        options={WAGER_TIME_OPTIONS}
        value={values.wagerTimeSec}
        format={(s) => (s === 0 ? t("room.timers.noLimit") : seconds(s))}
        disabled={disabled}
        onSelect={(wagerTimeSec) => set({ wagerTimeSec })}
        testId="wager-time-settings"
        help={t("room.timers.wagerTimeHelp")}
      />
    </div>
  );
}

/** AnswerTimerSettings is the room's "Room timers" panel, connected to the
 * room: changes are saved right away. Read-only (the current values shown,
 * controls disabled) for everyone but the admin. */
export function AnswerTimerSettings({
  roomId,
  userId,
  isAdmin = false,
  isHost = false,
  showTitle = true,
}: RoomProps & SettingsAccessProps & { showTitle?: boolean }) {
  const { t } = useTranslation();
  const { values, editable, canChange, save } = useRoomSettings({
    roomId,
    userId,
    isAdmin,
    isHost,
  });

  return (
    <div className="flex flex-col gap-3">
      {showTitle ? (
        <span className="font-bold text-white">{t("room.timers.title")}</span>
      ) : null}
      <RoomTimersFields values={values} onChange={save} disabled={!canChange} />
      <p className="text-xs text-slate-400">
        {!editable
          ? t("room.answerTimeAdminOnly")
          : canChange
            ? t("room.answerTimeHelp")
            : t("room.answerTimeBetweenQuestions")}
      </p>
    </div>
  );
}

/** AnswerTimerControl is the room's header button showing the answer time
 * ("⏱ Off" / "⏱ 15 s"); it opens the room timers. Like Pause, it is only
 * available between questions. For everyone but the admin it only shows the
 * value ("Only the admin can change this"). */
export function AnswerTimerControl({
  roomId,
  userId,
  isAdmin = false,
  isHost = false,
}: RoomProps & SettingsAccessProps) {
  const { t } = useTranslation();
  const { answerTimeSec, activeClue, type } = useEngineContext();
  const [open, setOpen] = React.useState(false);
  const canChange = activeClue === null && type !== GameState.GameOver;
  const value =
    answerTimeSec === 0
      ? t("room.answerTimeOff")
      : t("room.answerTimeSeconds", { seconds: answerTimeSec });
  const content = (
    <>
      <span className="text-base" aria-hidden>
        {TIMER_SYMBOL}
      </span>
      <span>{value}</span>
    </>
  );

  if (!mayEditSettings(roomId, isAdmin, isHost)) {
    const label = t("room.answerTimeReadOnly", { value });
    return (
      <span
        title={label}
        data-testid="answer-time-readonly"
        className="flex cursor-default items-center gap-2 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap text-slate-300"
      >
        {content}
        <span className="sr-only">{t("room.answerTimeAdminOnly")}</span>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!canChange}
        aria-label={t("room.answerTimeSettings")}
        title={
          canChange
            ? t("room.answerTimeSettings")
            : t("room.answerTimeBetweenQuestions")
        }
        className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm whitespace-nowrap text-slate-300 transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-40"
      >
        {content}
      </button>
      <Dialog
        isOpen={open && canChange}
        onClose={() => setOpen(false)}
        title={t("room.answerTimeSettings")}
        description={null}
      >
        <AnswerTimerSettings
          roomId={roomId}
          userId={userId}
          isAdmin={isAdmin}
          isHost={isHost}
          showTitle={false}
        />
        <div className="mt-4">
          <Dialog.Footer>
            <Button type="button" onClick={() => setOpen(false)}>
              {t("common.close")}
            </Button>
          </Dialog.Footer>
        </div>
      </Dialog>
    </>
  );
}
