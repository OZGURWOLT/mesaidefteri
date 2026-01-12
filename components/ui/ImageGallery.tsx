'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import Modal from './Modal'

interface ImageGalleryProps {
  images: string[]
  alt?: string
  className?: string
}

export default function ImageGallery({ images, alt = 'Fotoğraf', className = '' }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (images.length === 0) return null

  const openModal = (index: number) => {
    setSelectedIndex(index)
  }

  const closeModal = () => {
    setSelectedIndex(null)
  }

  const nextImage = () => {
    if (selectedIndex !== null && selectedIndex < images.length - 1) {
      setSelectedIndex(selectedIndex + 1)
    }
  }

  const prevImage = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  return (
    <>
      {/* Thumbnail Grid */}
      <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 ${className}`}>
        {images.map((url, index) => (
          <div
            key={index}
            onClick={() => openModal(index)}
            className="relative group cursor-pointer aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100 hover:border-blue-400 hover:shadow-md transition-all"
          >
            <img
              src={url}
              alt={`${alt} ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium">
                Büyüt
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full Screen Modal */}
      {selectedIndex !== null && (
        <Modal
          isOpen={selectedIndex !== null}
          onClose={closeModal}
          title={`${alt} ${selectedIndex + 1} / ${images.length}`}
          size="xl"
        >
          <div className="relative">
            {/* Full Size Image */}
            <div className="relative w-full h-[70vh] bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src={images[selectedIndex]}
                alt={`${alt} ${selectedIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Navigation Buttons */}
            {images.length > 1 && (
              <>
                {/* Previous Button */}
                {selectedIndex > 0 && (
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all"
                    aria-label="Önceki fotoğraf"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                )}

                {/* Next Button */}
                {selectedIndex < images.length - 1 && (
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all"
                    aria-label="Sonraki fotoğraf"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                )}
              </>
            )}

            {/* Thumbnail Navigation */}
            {images.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {images.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      index === selectedIndex
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <img
                      src={url}
                      alt={`${alt} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
