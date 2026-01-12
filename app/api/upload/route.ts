import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { uploadImage } from '@/lib/cloudinary'

export async function POST(request: NextRequest) {
  try {
    // Session kontrolü
    await requireAuth()

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const folder = (formData.get('folder') as string) || 'mesaidefteri/uploads'

    if (!file) {
      return NextResponse.json(
        { error: 'Dosya bulunamadı' },
        { status: 400 }
      )
    }

    // Dosya tipi kontrolü
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Sadece resim dosyaları yüklenebilir' },
        { status: 400 }
      )
    }

    // Dosya boyutu kontrolü (max 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Dosya boyutu çok büyük. Maksimum 10MB yükleyebilirsiniz.' },
        { status: 400 }
      )
    }

    // Cloudinary'ye yükle
    const result = await uploadImage(file, folder)

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      message: 'Fotoğraf başarıyla yüklendi'
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Fotoğraf yüklenirken bir hata oluştu' },
      { status: 500 }
    )
  }
}
