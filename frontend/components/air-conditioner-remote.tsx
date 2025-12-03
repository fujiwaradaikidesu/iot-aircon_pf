"use client"

import type React from "react"

import { useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Snackbar,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import { AcUnit, Air, ArrowDownward, ArrowUpward, PowerSettingsNew, Whatshot } from "@mui/icons-material"

import { mqttClient } from "@/lib/mqttClient"
import {
  DEFAULT_FAN_SPEED,
  DEFAULT_TEMPERATURE,
  FAN_SPEED_OPTIONS,
  TEMPERATURE_OPTIONS,
  type FanSpeedOption,
  type TemperatureOption,
} from "@/lib/controlOptions"

// カスタムテーマの作成
const theme = createTheme({
  palette: {
    primary: {
      main: "#2196f3",
    },
    secondary: {
      main: "#f50057",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        },
      },
    },
  },
})

type Mode = "cool" | "heat"
type Mode = "cool" | "heat"
type Temperature = TemperatureOption
type FanSpeed = FanSpeedOption

export default function AirConditionerRemote() {
  const [power, setPower] = useState<boolean>(false)
  const [mode, setMode] = useState<Mode>("cool")
  const [temperature, setTemperature] = useState<Temperature>(DEFAULT_TEMPERATURE)
  const [fanSpeed, setFanSpeed] = useState<FanSpeed>(DEFAULT_FAN_SPEED)
  const [loading, setLoading] = useState<boolean>(false)
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  })
  const [hasPendingChanges, setHasPendingChanges] = useState<boolean>(false)

  const handlePowerToggle = () => {
    const newPowerState = !power
    setPower(newPowerState)
    setHasPendingChanges(true)
  }

  const handleModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: Mode) => {
    if (newMode !== null) {
      setMode(newMode)
      setHasPendingChanges(true)
    }
  }

  const handleTemperatureChange = (newTemp: Temperature) => {
    setTemperature(newTemp)
    setHasPendingChanges(true)
  }

  const handleSendCommand = async () => {
    setLoading(true)
    try {
      await sendApiRequest(power, mode, temperature, fanSpeed)
      setNotification({
        open: true,
        message: "コマンドを送信しました",
        severity: "success",
      })
      setHasPendingChanges(false)
    } catch (error) {
      console.error("API request failed:", error)
      setNotification({
        open: true,
        message: "エラーが発生しました",
        severity: "error",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTemperatureStep = (direction: "up" | "down") => {
    const currentIndex = TEMPERATURE_OPTIONS.indexOf(temperature)
    if (direction === "up" && currentIndex < TEMPERATURE_OPTIONS.length - 1) {
      handleTemperatureChange(TEMPERATURE_OPTIONS[currentIndex + 1])
    } else if (direction === "down" && currentIndex > 0) {
      handleTemperatureChange(TEMPERATURE_OPTIONS[currentIndex - 1])
    }
  }

  const sendApiRequest = async (powerOn: boolean, acMode: Mode, temp: Temperature, fanSpeed: number) => {
    try {
      const command = {
        power_on: powerOn,
        mode: acMode,
        temperature: temp,
        fan_speed: fanSpeed
      };

      mqttClient.publish('aircon/control', JSON.stringify(command));
      return { success: true };
    } catch (error) {
      console.error('MQTT request error:', error);
      throw error;
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false })
  }

  const getTemperatureColor = () => {
    return mode === "cool" ? "#2196f3" : "#f44336"
  }

  const canIncreaseTemp = useMemo(() => {
    const idx = TEMPERATURE_OPTIONS.indexOf(temperature)
    return idx < TEMPERATURE_OPTIONS.length - 1
  }, [temperature])

  const canDecreaseTemp = useMemo(() => {
    const idx = TEMPERATURE_OPTIONS.indexOf(temperature)
    return idx > 0
  }, [temperature])

  return (
    <ThemeProvider theme={theme}>
      <Card
        sx={{
          width: "100%",
          maxWidth: 400,
          overflow: "visible",
          position: "relative",
          background: "linear-gradient(145deg, #ffffff, #f0f0f0)",
        }}
      >
        {loading && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255, 255, 255, 0.7)",
              zIndex: 10,
              borderRadius: 3,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h5" component="h2" fontWeight="bold">
              Remote
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <PowerSettingsNew color={power ? "primary" : "disabled"} sx={{ mr: 1 }} />
              <Switch checked={power} onChange={handlePowerToggle} color="primary" />
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Box
            sx={{
              transition: "opacity 0.3s ease",
            }}
          >
            {hasPendingChanges && (
              <Chip
                color="warning"
                label="未送信の変更があります"
                size="small"
                sx={{ mb: 2 }}
              />
            )}

            {/* 温度表示 */}
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mb: 4, position: "relative" }}>
              <ButtonBase
                onClick={handleSendCommand}
                sx={{
                  borderRadius: "50%",
                  p: 0,
                  display: "inline-flex",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                }}
                focusRipple
                disabled={loading}
              >
                <Box
                  sx={{
                    width: 160,
                    height: 160,
                    borderRadius: "50%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    background: "white",
                    position: "relative",
                    border: `4px solid ${getTemperatureColor()}`,
                  }}
                >
                  <Typography variant="h2" component="div" fontWeight="bold" color={getTemperatureColor()}>
                    {temperature}
                  </Typography>
                  <Typography variant="h6" component="div" sx={{ position: "absolute", top: "60%" }}>
                    ℃
                  </Typography>
                </Box>
              </ButtonBase>

              <Box sx={{ position: "absolute", right: 0, display: "flex", flexDirection: "column" }}>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ mb: 1, minWidth: 40, width: 40, height: 40, borderRadius: "50%" }}
                  onClick={() => handleTemperatureStep("up")}
                  disabled={!canIncreaseTemp}
                >
                  <ArrowUpward />
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ minWidth: 40, width: 40, height: 40, borderRadius: "50%" }}
                  onClick={() => handleTemperatureStep("down")}
                  disabled={!canDecreaseTemp}
                >
                  <ArrowDownward />
                </Button>
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              温度表示をタップしてコマンド送信
            </Typography>

            {/* モード選択 */}
            <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1 }}>
              モード
            </Typography>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={handleModeChange}
              aria-label="air conditioner mode"
              sx={{
                width: "100%",
                mb: 3,
                "& .MuiToggleButton-root": {
                  flex: 1,
                  py: 1.5,
                },
              }}
            >
              <ToggleButton value="cool" aria-label="cool mode">
                <AcUnit sx={{ mr: 1 }} />
                冷房
              </ToggleButton>
              <ToggleButton value="heat" aria-label="heat mode">
                <Whatshot sx={{ mr: 1 }} />
                暖房
              </ToggleButton>
            </ToggleButtonGroup>

            {/* 風量表示 */}
            <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 1 }}>
              風量
            </Typography>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "rgba(0, 0, 0, 0.04)",
                display: "flex",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Air sx={{ mr: 1 }} />
              <Typography>{fanSpeed}</Typography>
            </Box>

            {/* 現在の設定情報 */}
            <Box
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 2,
                bgcolor: "rgba(0, 0, 0, 0.04)",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                現在の設定:
                {power ? ` ${mode === "cool" ? "冷房" : "暖房"} ${temperature}℃ 風量${fanSpeed}` : " オフ"}
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 3, py: 1.5 }}
              onClick={handleSendCommand}
              disabled={loading}
            >
              {loading ? "送信中..." : "送信"}
            </Button>
          </Box>
        </CardContent>

        <Snackbar
          open={notification.open}
          autoHideDuration={3000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: "100%" }}>
            {notification.message}
          </Alert>
        </Snackbar>
      </Card>
    </ThemeProvider>
  )
}
