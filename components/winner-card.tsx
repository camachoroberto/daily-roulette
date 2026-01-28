"use client"

import { Card, CardContent } from "@/components/ui/card"

interface WinnerCardProps {
  winnerName: string
  createdAt: string
}

export function WinnerCard({ winnerName, createdAt }: WinnerCardProps) {
  const formattedDate = new Date(createdAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <Card className="border-t-4 border-t-accent">
      <CardContent className="pt-6">
        <div className="text-center space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Sorteado</p>
            <h2 className="text-3xl font-bold text-foreground">{winnerName}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
        </div>
      </CardContent>
    </Card>
  )
}
