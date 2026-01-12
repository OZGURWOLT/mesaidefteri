/**
 * Sistem log kaydı helper fonksiyonu
 * Tüm sistem aktivitelerini loglar
 */

interface CreateSystemLogParams {
  type: string
  description: string
  userId?: string
  taskId?: string
  branchId?: string
  details?: any
}

/**
 * Sistem logu oluştur
 * @param params - Log parametreleri
 */
export async function createSystemLog(params: CreateSystemLogParams): Promise<void> {
  try {
    const response = await fetch('/api/system/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      console.error('System log oluşturulamadı:', await response.text())
    }
  } catch (error) {
    // Log kaydı başarısız olsa bile ana işlemi engelleme
    console.error('System log hatası:', error)
  }
}
