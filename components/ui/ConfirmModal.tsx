'use client'

import { AlertCircle, CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react'
import Modal from './Modal'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  confirmText?: string
  cancelText?: string
  loading?: boolean
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'Onayla',
  cancelText = 'İptal',
  loading = false
}: ConfirmModalProps) {
  const typeConfig = {
    success: {
      icon: CheckCircle2,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      confirmButton: 'bg-green-600 hover:bg-green-700 text-white'
    },
    error: {
      icon: XCircle,
      iconColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      confirmButton: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white'
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  }

  const config = typeConfig[type]
  const Icon = config.icon

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        {/* Icon and Message */}
        <div className={`flex items-start gap-4 p-4 rounded-xl ${config.bgColor} border ${config.borderColor}`}>
          <Icon className={`w-6 h-6 ${config.iconColor} flex-shrink-0 mt-0.5`} />
          <p className="text-sm text-gray-700 leading-relaxed flex-1">{message}</p>
        </div>

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
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${config.confirmButton}`}
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
