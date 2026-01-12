'use client'

import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import Modal from './Modal'

interface InputModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (value: string | number) => void
  title: string
  label: string
  placeholder?: string
  type?: 'text' | 'number' | 'textarea' | 'password'
  defaultValue?: string | number
  confirmText?: string
  cancelText?: string
  loading?: boolean
  required?: boolean
  min?: number
  max?: number
  error?: string
}

export default function InputModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  label,
  placeholder,
  type = 'text',
  defaultValue = '',
  confirmText = 'Kaydet',
  cancelText = 'İptal',
  loading = false,
  required = false,
  min,
  max,
  error
}: InputModalProps) {
  const [value, setValue] = useState<string | number>(defaultValue)
  const [localError, setLocalError] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue)
      setLocalError('')
    }
  }, [isOpen, defaultValue])

  const handleConfirm = () => {
    setLocalError('')

    // Validation
    if (required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      setLocalError(`${label} zorunludur`)
      return
    }

    if (type === 'number') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value
      if (isNaN(numValue)) {
        setLocalError('Geçerli bir sayı giriniz')
        return
      }
      if (min !== undefined && numValue < min) {
        setLocalError(`Minimum değer: ${min}`)
        return
      }
      if (max !== undefined && numValue > max) {
        setLocalError(`Maksimum değer: ${max}`)
        return
      }
      onConfirm(numValue)
    } else {
      // Text veya textarea için string değeri gönder
      onConfirm(typeof value === 'string' ? value : String(value))
    }
  }

  const displayError = error || localError

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        {/* Label and Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {type === 'textarea' ? (
            <textarea
              value={value as string}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              required={required}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              rows={4}
            />
          ) : (
            <input
              type={type}
              value={value}
              onChange={(e) => setValue(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
              placeholder={placeholder}
              required={required}
              min={min}
              max={max}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          )}
        </div>

        {/* Error Message */}
        {displayError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{displayError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}
