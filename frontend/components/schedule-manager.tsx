"use client"

import { useMemo, useState } from "react"

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material"
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline"
import RefreshIcon from "@mui/icons-material/Refresh"

import { SchedulePayload, useScheduler } from "@/hooks/useScheduler"
import {
  FAN_SPEED_OPTIONS,
  TEMPERATURE_OPTIONS,
  type FanSpeedOption,
  type TemperatureOption,
} from "@/lib/controlOptions"

const WEEKDAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"]

type RepeatType = "daily" | "weekdays" | "weekends" | "custom"

type FormState = {
  time: string
  powerOn: boolean
  mode: "cool" | "heat"
  temperature: TemperatureOption
  fanSpeed: FanSpeedOption
  repeatType: RepeatType
  repeatDays: number[]
}

const DEFAULT_FORM_STATE: FormState = {
  time: "08:00",
  powerOn: true,
  mode: "cool" as "cool" | "heat",
  temperature: TEMPERATURE_OPTIONS[0],
  fanSpeed: FAN_SPEED_OPTIONS[0],
  repeatType: "weekdays" as RepeatType,
  repeatDays: [0, 1, 2, 3, 4],
}

export default function ScheduleManager() {
  const {
    schedules,
    loading,
    error,
    summary,
    lastTrigger,
    refreshSchedules,
    createOrUpdateSchedule,
    deleteSchedule,
    toggleSchedule,
  } = useScheduler()

  const [formState, setFormState] = useState(DEFAULT_FORM_STATE)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  })

  const repeatLabel = useMemo(() => {
    switch (formState.repeatType) {
      case "daily":
        return "毎日"
      case "weekdays":
        return "平日"
      case "weekends":
        return "休日"
      case "custom":
        return formState.repeatDays.length
          ? formState.repeatDays.map((day) => WEEKDAY_LABELS[day]).join("・")
          : "曜日未選択"
      default:
        return ""
    }
  }, [formState.repeatType, formState.repeatDays])

  const handleFormChange = (field: keyof typeof formState, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleDayToggle = (dayIndex: number) => {
    setFormState((prev) => {
      const exists = prev.repeatDays.includes(dayIndex)
      const nextDays = exists ? prev.repeatDays.filter((day) => day !== dayIndex) : [...prev.repeatDays, dayIndex]
      nextDays.sort((a, b) => a - b)
      return { ...prev, repeatDays: nextDays }
    })
  }

  const buildSchedulePayload = (): SchedulePayload => {
    const repeat =
      formState.repeatType === "custom"
        ? { type: "custom", days: formState.repeatDays }
        : ({ type: formState.repeatType } as SchedulePayload["repeat"])

    return {
      time: formState.time,
      power_on: formState.powerOn,
      mode: formState.mode,
      temperature: formState.temperature,
      fan_speed: formState.fanSpeed,
      repeat,
      enabled: true,
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const payload = buildSchedulePayload()
      await createOrUpdateSchedule(payload)
      setSnackbar({ open: true, message: "スケジュールを追加しました", severity: "success" })
      setFormState(DEFAULT_FORM_STATE)
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "スケジュールの追加に失敗しました",
        severity: "error",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    const schedule = schedules.find((item) => item.id === id)
    if (!schedule) return
    try {
      await toggleSchedule(schedule, enabled)
      setSnackbar({
        open: true,
        message: enabled ? "スケジュールを有効化しました" : "スケジュールを無効化しました",
        severity: "success",
      })
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "更新に失敗しました",
        severity: "error",
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id)
      setSnackbar({
        open: true,
        message: "スケジュールを削除しました",
        severity: "success",
      })
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "削除に失敗しました",
        severity: "error",
      })
    }
  }

  const formatRepeat = (repeat: SchedulePayload["repeat"]) => {
    switch (repeat.type) {
      case "daily":
        return "毎日"
      case "weekdays":
        return "平日"
      case "weekends":
        return "休日"
      case "custom":
        return repeat.days?.map((day) => WEEKDAY_LABELS[day]).join("・") || "曜日未設定"
      default:
        return ""
    }
  }

  return (
    <Card
      sx={{
        width: "100%",
        maxWidth: 500,
        borderRadius: 3,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" fontWeight="bold">
            スケジュール
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={refreshSchedules}
            disabled={loading}
          >
            再取得
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" mb={2}>
          合計 {summary.total} 件 / 有効 {summary.enabled} 件
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {lastTrigger && (
          <Alert severity="info" sx={{ mb: 2 }}>
            直近の実行: {lastTrigger}
          </Alert>
        )}
        <Divider sx={{ mb: 2 }} />
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : schedules.length === 0 ? (
          <Box py={4} textAlign="center" color="text.secondary">
            スケジュールはまだありません
          </Box>
        ) : (
          <List dense>
            {schedules.map((schedule) => (
              <ListItem
                key={schedule.id}
                sx={{ borderRadius: 2, mb: 1, border: "1px solid rgba(0,0,0,0.08)" }}
                secondaryAction={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={schedule.enabled}
                          onChange={(_, checked) => handleToggle(schedule.id, checked)}
                        />
                      }
                      label=""
                    />
                    <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(schedule.id)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Stack>
                }
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight="bold">{schedule.time}</Typography>
                      <Chip
                        size="small"
                        color={schedule.power_on ? "primary" : "default"}
                        label={schedule.power_on ? "ON" : "OFF"}
                      />
                      <Chip
                        size="small"
                        label={`${schedule.mode === "cool" ? "冷房" : "暖房"} / ${schedule.temperature}℃ / 風量${
                          schedule.fan_speed ?? FAN_SPEED_OPTIONS[0]
                        }`}
                      />
                    </Stack>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {formatRepeat(schedule.repeat)}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>

      <Divider />

      <CardContent sx={{ p: 4 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          新規スケジュール
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="時刻"
              type="time"
              value={formState.time}
              onChange={(e) => handleFormChange("time", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="mode-label">モード</InputLabel>
              <Select
                labelId="mode-label"
                label="モード"
                value={formState.mode}
                onChange={(e) => handleFormChange("mode", e.target.value as "cool" | "heat")}
              >
                <MenuItem value="cool">冷房</MenuItem>
                <MenuItem value="heat">暖房</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="temperature-label">温度 (℃)</InputLabel>
              <Select
                labelId="temperature-label"
                label="温度 (℃)"
                value={formState.temperature}
                onChange={(e) => handleFormChange("temperature", Number(e.target.value) as TemperatureOption)}
              >
                {TEMPERATURE_OPTIONS.map((temp) => (
                  <MenuItem key={temp} value={temp}>
                    {temp}℃
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="fan-label">風量</InputLabel>
              <Select
                labelId="fan-label"
                label="風量"
                value={formState.fanSpeed}
                onChange={(e) => handleFormChange("fanSpeed", Number(e.target.value) as FanSpeedOption)}
              >
                {FAN_SPEED_OPTIONS.map((speed) => (
                  <MenuItem key={speed} value={speed}>
                    {speed}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={formState.powerOn} onChange={(_, checked) => handleFormChange("powerOn", checked)} />}
              label={formState.powerOn ? "電源 ON" : "電源 OFF"}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="repeat-type-label">繰り返し</InputLabel>
              <Select
                labelId="repeat-type-label"
                label="繰り返し"
                value={formState.repeatType}
                onChange={(e) => handleFormChange("repeatType", e.target.value as RepeatType)}
              >
                <MenuItem value="daily">毎日</MenuItem>
                <MenuItem value="weekdays">平日</MenuItem>
                <MenuItem value="weekends">休日</MenuItem>
                <MenuItem value="custom">曜日を指定</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} display="flex" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {repeatLabel}
            </Typography>
          </Grid>
          {formState.repeatType === "custom" && (
            <Grid item xs={12}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {WEEKDAY_LABELS.map((label, index) => {
                  const selected = formState.repeatDays.includes(index)
                  return (
                    <Chip
                      key={label}
                      label={label}
                      variant={selected ? "filled" : "outlined"}
                      color={selected ? "primary" : "default"}
                      onClick={() => handleDayToggle(index)}
                      sx={{ mb: 1 }}
                    />
                  )
                })}
              </Stack>
            </Grid>
          )}
        </Grid>

        <Button
          fullWidth
          sx={{ mt: 3, py: 1.5 }}
          variant="contained"
          disabled={isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? "送信中..." : "スケジュールを追加"}
        </Button>
      </CardContent>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Card>
  )
}


