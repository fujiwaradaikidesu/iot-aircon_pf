export const TEMPERATURE_OPTIONS = [23, 25] as const
export type TemperatureOption = (typeof TEMPERATURE_OPTIONS)[number]
export const DEFAULT_TEMPERATURE: TemperatureOption = TEMPERATURE_OPTIONS[0]

export const FAN_SPEED_OPTIONS = [3] as const
export type FanSpeedOption = (typeof FAN_SPEED_OPTIONS)[number]
export const DEFAULT_FAN_SPEED: FanSpeedOption = FAN_SPEED_OPTIONS[0]

