import { NextRequest, NextResponse } from "next/server"
import { SignJWT, jwtVerify } from "jose"

const SESSION_SECRET = process.env.SESSION_SECRET
const COOKIE_NAME = "room_session"

if (!SESSION_SECRET) {
  throw new Error("SESSION_SECRET não está definido nas variáveis de ambiente")
}

const secret = new TextEncoder().encode(SESSION_SECRET)

export interface RoomSession {
  roomId: string
  exp: number
}

/**
 * Cria uma sessão para uma sala
 */
export async function createRoomSession(roomId: string): Promise<string> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias

  const session = await new SignJWT({ roomId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secret)

  return session
}

/**
 * Verifica e decodifica uma sessão
 */
export async function verifyRoomSession(
  token: string
): Promise<RoomSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return {
      roomId: payload.roomId as string,
      exp: payload.exp as number,
    }
  } catch (error) {
    return null
  }
}

/**
 * Obtém a sessão da requisição (para route handlers)
 */
export async function getRoomSessionFromRequest(
  request: NextRequest
): Promise<RoomSession | null> {
  const sessionToken = request.cookies.get(COOKIE_NAME)?.value

  if (!sessionToken) {
    return null
  }

  return verifyRoomSession(sessionToken)
}

/**
 * Verifica se a requisição tem uma sessão válida para a sala especificada
 * Retorna a sessão se válida, null caso contrário
 */
export async function requireRoomSession(
  request: NextRequest,
  roomId: string
): Promise<RoomSession | null> {
  const session = await getRoomSessionFromRequest(request)

  if (!session) {
    return null
  }

  if (session.roomId !== roomId) {
    return null
  }

  // Verificar se não expirou
  if (session.exp * 1000 < Date.now()) {
    return null
  }

  return session
}

/**
 * Define o cookie de sessão na resposta
 */
export function setRoomSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60, // 7 dias em segundos
    path: "/",
  })
}

/**
 * Remove o cookie de sessão
 */
export function clearRoomSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  })
}
