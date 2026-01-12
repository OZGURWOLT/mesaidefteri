import { v2 as cloudinary } from 'cloudinary'

// Cloudinary yapılandırması
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name',
  api_key: process.env.CLOUDINARY_API_KEY || 'your-api-key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your-api-secret',
  secure: true
})

export default cloudinary

/**
 * Fotoğrafı Cloudinary'ye yükler
 * @param file - File objesi veya base64 string
 * @param folder - Cloudinary klasör yolu (opsiyonel)
 * @returns Cloudinary upload result
 */
export async function uploadImage(
  file: File | string,
  folder: string = 'mesaidefteri/uploads'
): Promise<{ secure_url: string; public_id: string }> {
  try {
    let uploadResult

    if (typeof file === 'string') {
      // Base64 string ise
      uploadResult = await cloudinary.uploader.upload(file, {
        folder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      })
    } else {
      // File objesi ise - ArrayBuffer'a çevir
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Base64'e çevir
      const base64 = buffer.toString('base64')
      const dataUri = `data:${file.type};base64,${base64}`
      
      uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      })
    }

    return {
      secure_url: uploadResult.secure_url,
      public_id: uploadResult.public_id
    }
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw new Error('Fotoğraf yüklenirken bir hata oluştu')
  }
}

/**
 * Fotoğrafı Cloudinary'den siler
 * @param publicId - Cloudinary public_id
 */
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId)
  } catch (error) {
    console.error('Cloudinary delete error:', error)
    throw new Error('Fotoğraf silinirken bir hata oluştu')
  }
}

/**
 * Fotoğrafı Cloudinary'ye yükler (client-side için wrapper)
 * @param file - File objesi
 * @returns Cloudinary URL'i
 */
export async function uploadToCloudinary(file: File): Promise<string | null> {
  try {
    const result = await uploadImage(file)
    return result.secure_url
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    return null
  }
}
