"use client"

import { useMemo, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Switch } from "@/components/ui/switch"

interface Participant {
  id: string
  name: string
  winCount: number
}

interface RankingChartProps {
  participants: Participant[]
}

export function RankingChart({ participants }: RankingChartProps) {
  const [showAll, setShowAll] = useState(false)

  const chartData = useMemo(() => {
    const sorted = [...participants]
      .filter((p) => p.winCount > 0)
      .sort((a, b) => b.winCount - a.winCount)

    return showAll ? sorted : sorted.slice(0, 10)
  }, [participants, showAll])

  const hasAnyWins = participants.some((p) => p.winCount > 0)

  if (!hasAnyWins) {
    return (
      <div className="flex items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">Ainda não houve sorteios nesta sala.</p>
      </div>
    )
  }

  const maxWinCount = Math.max(...chartData.map((d) => d.winCount), 1)

  return (
    <div className="space-y-4">
      {participants.filter((p) => p.winCount > 0).length > 10 && (
        <div className="flex items-center gap-2">
          <Switch
            id="show-all-ranking"
            checked={showAll}
            onCheckedChange={setShowAll}
          />
          <label
            htmlFor="show-all-ranking"
            className="text-sm cursor-pointer text-foreground"
          >
            Ver todos ({participants.filter((p) => p.winCount > 0).length})
          </label>
        </div>
      )}

      <div className="w-full" style={{ height: `${Math.max(300, chartData.length * 40)}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[0, maxWinCount]}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.toString()}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as Participant
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-md">
                      <p className="font-medium">{data.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.winCount} vez{data.winCount !== 1 ? "es" : ""} sorteado
                        {data.winCount !== 1 ? "" : ""}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar
              dataKey="winCount"
              radius={[0, 4, 4, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.winCount === maxWinCount
                      ? "hsl(25, 95%, 53%)"
                      : "hsl(220, 90%, 25%)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
