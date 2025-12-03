"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { mqttClient } from "@/lib/mqttClient"

const SCHEDULE_TOPICS = {
  response: "aircon/schedule/response",
  create: "aircon/schedule/create",
  update: "aircon/schedule/update",
  delete: "aircon/schedule/delete",
  list: "aircon/schedule/list",
} as const

type SchedulerAction = keyof typeof SCHEDULE_TOPICS

export type ScheduleRepeat =
  | { type: "daily" }
  | { type: "weekdays" }
  | { type: "weekends" }
  | { type: "custom"; days: number[] }

export interface ScheduleItem {
  id: string
  time: string
  power_on: boolean
  mode: "cool" | "heat"
  temperature: number
  fan_speed: number
  repeat: ScheduleRepeat
  enabled: boolean
  topic?: string
}

export type SchedulePayload = Omit<ScheduleItem, "id"> & { id?: string }

interface SchedulerResponse {
  action: string
  status: string
  data?: Record<string, any>
  error?: string
  request_id?: string
}

interface PendingRequest {
  resolve: (response: SchedulerResponse) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

const RESPONSE_TIMEOUT = 8000

export function useScheduler() {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastTrigger, setLastTrigger] = useState<string | null>(null)

  const pendingRequests = useRef<Map<string, PendingRequest>>(new Map())
  const schedulesRef = useRef<ScheduleItem[]>([])

  const resolveRequest = useCallback((response: SchedulerResponse) => {
    const requestId = response.request_id
    if (!requestId) return

    const pending = pendingRequests.current.get(requestId)
    if (!pending) return

    clearTimeout(pending.timer)
    pendingRequests.current.delete(requestId)
    pending.resolve(response)
  }, [])

  const handleResponse = useCallback(
    (message: string) => {
      try {
        const parsed = JSON.parse(message) as SchedulerResponse

        if (parsed.request_id && pendingRequests.current.has(parsed.request_id)) {
          resolveRequest(parsed)
          return
        }

        if (parsed.action === "trigger" && parsed.status === "success") {
          const scheduleId = parsed.data?.schedule_id
          if (scheduleId) {
            const firedSchedule = schedulesRef.current.find((s) => s.id === scheduleId)
            const label = firedSchedule
              ? `${firedSchedule.time} / ${firedSchedule.mode} ${firedSchedule.temperature}℃`
              : `ID: ${scheduleId}`
            setLastTrigger(label)
          }
        }
      } catch (err) {
        console.error("Failed to process scheduler response:", err)
      }
    },
    [resolveRequest],
  )

  const sendCommand = useCallback(
    (action: SchedulerAction, body: Record<string, any> = {}) => {
      const topic = SCHEDULE_TOPICS[action]
      if (!topic) {
        return Promise.reject(new Error(`Unknown scheduler action: ${action}`))
      }

      const requestId =
        globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10)

      return new Promise<SchedulerResponse>((resolve, reject) => {
        const timer = setTimeout(() => {
          pendingRequests.current.delete(requestId)
          reject(new Error("Scheduler response timeout"))
        }, RESPONSE_TIMEOUT)

        pendingRequests.current.set(requestId, { resolve, reject, timer })
        const payload = JSON.stringify({ request_id: requestId, ...body })
        mqttClient.publish(topic, payload)
      })
    },
    [],
  )

  const refreshSchedules = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await sendCommand("list")
      if (response.status === "success") {
        const next = (response.data?.schedules as ScheduleItem[]) ?? []
        schedulesRef.current = next
        setSchedules(next)
      } else {
        throw new Error(response.error || "スケジュールの取得に失敗しました")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "スケジュールの取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [sendCommand])

  const createOrUpdateSchedule = useCallback(
    async (schedule: SchedulePayload) => {
      setError(null)
      const action: SchedulerAction = schedule.id ? "update" : "create"
      const response = await sendCommand(action, { schedule })
      if (response.status !== "success") {
        throw new Error(response.error || "スケジュールの保存に失敗しました")
      }
      await refreshSchedules()
      return response
    },
    [refreshSchedules, sendCommand],
  )

  const toggleSchedule = useCallback(
    async (schedule: ScheduleItem, enabled: boolean) => {
      await createOrUpdateSchedule({ ...schedule, enabled })
    },
    [createOrUpdateSchedule],
  )

  const deleteSchedule = useCallback(
    async (id: string) => {
      setError(null)
      const response = await sendCommand("delete", { id })
      if (response.status !== "success") {
        throw new Error(response.error || "スケジュールの削除に失敗しました")
      }
      await refreshSchedules()
    },
    [refreshSchedules, sendCommand],
  )

  useEffect(() => {
    mqttClient.subscribe(SCHEDULE_TOPICS.response, handleResponse)
    refreshSchedules()

    return () => {
      mqttClient.unsubscribe(SCHEDULE_TOPICS.response, handleResponse)
      pendingRequests.current.forEach(({ timer, reject }) => {
        clearTimeout(timer)
        reject(new Error("Scheduler hook unmounted"))
      })
      pendingRequests.current.clear()
    }
  }, [handleResponse, refreshSchedules])

  const summary = useMemo(
    () => ({
      total: schedules.length,
      enabled: schedules.filter((schedule) => schedule.enabled).length,
    }),
    [schedules],
  )

  return {
    schedules,
    loading,
    error,
    summary,
    lastTrigger,
    refreshSchedules,
    createOrUpdateSchedule,
    deleteSchedule,
    toggleSchedule,
  }
}

