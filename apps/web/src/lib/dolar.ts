/**
 * Obtiene la cotización del dólar blue de dolarhoy.com
 * via dolarapi.com (fuente: dolarhoy)
 */
export async function getDolarBlue(): Promise<number> {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares/blue', {
      next: { revalidate: 1800 }, // refresca cada 30 min
    })
    const data = await res.json()
    return data.venta ?? 1450
  } catch {
    return 1450 // fallback si no hay conexión
  }
}

export function usdToARS(usd: number, dolarBlue: number): number {
  // Redondea al millar más cercano hacia arriba
  return Math.ceil((usd * dolarBlue) / 1000) * 1000
}
