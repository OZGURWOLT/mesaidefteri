'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  UserCheck,
  UserCog,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  FileText,
  Clock,
  CheckCircle,
  X,
  Copy,
  RefreshCw,
  EyeOff
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import ConfirmModal from '@/components/ui/ConfirmModal'
import LogoutButton from '@/components/auth/LogoutButton'
import { UserRole } from '@prisma/client'

interface User {
  id: string
  username: string
  fullName: string
  role: UserRole
  createdAt: string
  updatedAt: string
}

export default function KullanicilarPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userTasks, setUserTasks] = useState<any[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'STAFF' as UserRole,
    staffDuty: '' as string,
    branchId: '' as string,
    managerId: '' as string,
    workScheduleType: '' as string, // SABIT_MESAI, VARDIYALI_MESAI
    fixedWorkStartTime: '' as string,
    fixedWorkEndTime: '' as string,
    fixedWorkOffDay: '' as string,
    shiftSchedule: '' as string // JSON string: {"Pazartesi": "09:00-17:30", "Salı": "off", ...}
  })
  const [shiftScheduleDays, setShiftScheduleDays] = useState<Record<string, string>>({})
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordCopied, setPasswordCopied] = useState(false)

  // Branches ve Managers listesi
  const [branches, setBranches] = useState<any[]>([])
  const [managers, setManagers] = useState<any[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)

  // Kullanıcıları yükle
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      const data = await response.json()

      if (response.ok && data.success) {
        setUsers(data.users)
        // Kullanıcılar yüklendikten sonra managers listesini de güncelle
        // (yeni bir yönetici eklendiyse dropdown'da görünsün)
        const managerUsers = (data.users || []).filter((u: any) => u.role === 'MANAGER' || u.role === 'SUPERVIZOR')
        setManagers(managerUsers)
      } else {
        setError(data.error || 'Kullanıcılar yüklenirken bir hata oluştu')
      }
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Kullanıcılar yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchBranchesAndManagers()
  }, [])

  // Branches ve Managers'ı yükle
  const fetchBranchesAndManagers = async () => {
    try {
      setLoadingBranches(true)
      
      // Branches'ı yükle
      const branchesResponse = await fetch('/api/branches')
      if (branchesResponse.ok) {
        const branchesData = await branchesResponse.json()
        setBranches(branchesData.branches || [])
      }

      // MANAGER ve SUPERVIZOR rolündeki kullanıcıları yükle
      const usersResponse = await fetch('/api/admin/users')
      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        // MANAGER ve SUPERVIZOR rolündeki kullanıcıları al
        const managerUsers = (usersData.users || []).filter((u: any) => u.role === 'MANAGER' || u.role === 'SUPERVIZOR')
        setManagers(managerUsers)
      }
    } catch (err) {
      console.error('Error fetching branches and managers:', err)
    } finally {
      setLoadingBranches(false)
    }
  }

  // Yetki kontrolü
  useEffect(() => {
    if (session?.user && session.user.role !== 'MANAGER' && session.user.role !== 'SUPERVIZOR') {
      router.push('/panel/satinalma')
    }
  }, [session, router])

  // Şifre validasyonu
  const validatePassword = (password: string): { valid: boolean; error?: string } => {
    if (password.length < 6) {
      return { valid: false, error: 'Şifre en az 6 karakter olmalıdır' }
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: 'Şifre en az bir büyük harf içermelidir' }
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return { valid: false, error: 'Şifre en az bir noktalama işareti içermelidir (!@#$%^&*()_+-=[]{}|;:,.<>?)' }
    }
    return { valid: true }
  }

  // Otomatik şifre oluştur
  const generatePassword = () => {
    const length = 12
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    
    let password = ''
    
    // En az bir büyük harf
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    // En az bir noktalama işareti
    password += symbols[Math.floor(Math.random() * symbols.length)]
    // En az bir küçük harf
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    // En az bir rakam
    password += numbers[Math.floor(Math.random() * numbers.length)]
    
    // Kalan karakterleri rastgele ekle
    const allChars = uppercase + lowercase + numbers + symbols
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)]
    }
    
    // Karakterleri karıştır
    password = password.split('').sort(() => Math.random() - 0.5).join('')
    
    setGeneratedPassword(password)
    setFormData({ ...formData, password })
    setPasswordCopied(false)
  }

  // Şifreyi kopyala
  const copyPassword = async () => {
    const passwordToCopy = generatedPassword || formData.password
    if (passwordToCopy) {
      try {
        await navigator.clipboard.writeText(passwordToCopy)
        setPasswordCopied(true)
        setTimeout(() => setPasswordCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy password:', err)
        setError('Şifre kopyalanamadı')
      }
    }
  }

  // Modal'ı aç - Yeni kullanıcı
  const handleOpenModal = () => {
    setEditingUser(null)
    setFormData({
      username: '',
      password: '',
      fullName: '',
      phone: '',
      role: 'STAFF',
      staffDuty: '',
      branchId: '',
      managerId: '',
      workScheduleType: '',
      fixedWorkStartTime: '',
      fixedWorkEndTime: '',
      fixedWorkOffDay: '',
      shiftSchedule: ''
    })
    setShiftScheduleDays({})
    setGeneratedPassword('')
    setShowPassword(false)
    setPasswordCopied(false)
    setError('')
    setSuccess('')
    setIsModalOpen(true)
  }

  // Modal'ı aç - Düzenle
  const handleEditUser = (user: User) => {
    setEditingUser(user)
    // Telefon numarasını veritabanından alırken +90 prefix'ini kaldır (sadece 10 haneli rakam göster)
    const phoneNumber = (user as any).phone || ''
    const cleanedPhone = phoneNumber.replace(/^\+?90/, '').replace(/^0/, '')
    
    // Parse shiftSchedule if it exists
    let parsedShiftSchedule: Record<string, string> = {}
    if ((user as any).shiftSchedule) {
      try {
        parsedShiftSchedule = JSON.parse((user as any).shiftSchedule)
      } catch (e) {
        console.error('Error parsing shiftSchedule:', e)
      }
    }
    
    setFormData({
      username: user.username,
      password: '', // Şifre güncelleme için boş bırak
      fullName: user.fullName,
      phone: cleanedPhone,
      role: user.role,
      staffDuty: (user as any).staffDuty || '',
      branchId: (user as any).branchId || '',
      managerId: (user as any).managerId || '',
      workScheduleType: (user as any).workScheduleType || '',
      fixedWorkStartTime: (user as any).fixedWorkStartTime || '',
      fixedWorkEndTime: (user as any).fixedWorkEndTime || '',
      fixedWorkOffDay: (user as any).fixedWorkOffDay || '',
      shiftSchedule: (user as any).shiftSchedule || ''
    })
    setShiftScheduleDays(parsedShiftSchedule)
    setError('')
    setSuccess('')
    setIsModalOpen(true)
  }

  // Kullanıcı kaydet (Yeni veya Güncelle)
  const handleSaveUser = async () => {
    try {
      setSubmitting(true)
      setError('')
      setSuccess('')

      // Validasyon
      if (!formData.username || !formData.fullName || !formData.role) {
        setError('Kullanıcı adı, ad soyad ve rol zorunludur')
        setSubmitting(false)
        return
      }

      // SUPERVIZOR kullanıcısının rolü değiştirilemez
      if (editingUser && editingUser.role === 'SUPERVIZOR' && formData.role !== 'SUPERVIZOR') {
        setError('Süpervizör kullanıcısının rolü değiştirilemez')
        setSubmitting(false)
        return
      }

      // Yeni kullanıcı oluştururken SUPERVIZOR rolü seçilemez
      if (!editingUser && formData.role === 'SUPERVIZOR') {
        setError('Yeni kullanıcılar Süpervizör rolü ile oluşturulamaz')
        setSubmitting(false)
        return
      }

      // Yeni kullanıcı için şube ve yönetici zorunlu (Süpervizör hariç)
      if (!editingUser && formData.role !== 'SUPERVIZOR') {
        if (!formData.branchId) {
          setError('Şube seçimi zorunludur')
          setSubmitting(false)
          return
        }
        if (!formData.managerId) {
          setError('Yönetici seçimi zorunludur')
          setSubmitting(false)
          return
        }
      }

      // Süpervizör için şube ve yönetici null olmalı
      if (formData.role === 'SUPERVIZOR') {
        formData.branchId = ''
        formData.managerId = ''
      }

      // Personel rolü için görev zorunlu
      if (formData.role === 'STAFF' && !formData.staffDuty) {
        setError('Personel rolü için personel görevi seçilmelidir')
        setSubmitting(false)
        return
      }

      // Şifre validasyonu (yeni kullanıcı veya şifre değiştiriliyorsa)
      if (!editingUser || formData.password) {
        const passwordValidation = validatePassword(formData.password)
        if (!passwordValidation.valid) {
          setError(passwordValidation.error || 'Şifre geçersiz')
          setSubmitting(false)
          return
        }
      }

      // Telefon numarası format kontrolü (opsiyonel ama varsa geçerli olmalı)
      // Artık +90 sabit, sadece 10 haneli rakam kontrolü yapıyoruz
      if (formData.phone) {
        const cleaned = formData.phone.replace(/[^\d]/g, '')
        if (cleaned.length !== 10 || !cleaned.startsWith('5')) {
          setError('Geçerli bir telefon numarası giriniz (5xxXXXxxxx formatında, +90 otomatik eklenir)')
          setSubmitting(false)
          return
        }
      }

      // Yeni kullanıcı için şifre zorunlu
      if (!editingUser && !formData.password) {
        setError('Yeni kullanıcı için şifre zorunludur')
        setSubmitting(false)
        return
      }

      let response
      if (editingUser) {
        // Güncelle
        response = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password || undefined, // Boşsa gönderme
            fullName: formData.fullName,
            phone: formData.phone || undefined,
            role: formData.role,
            staffDuty: formData.role === 'STAFF' ? formData.staffDuty : undefined,
            branchId: formData.role === 'SUPERVIZOR' ? undefined : (formData.branchId || undefined),
            managerId: formData.role === 'SUPERVIZOR' ? undefined : (formData.managerId || undefined),
            workScheduleType: formData.workScheduleType || undefined,
            fixedWorkStartTime: formData.workScheduleType === 'SABIT_MESAI' ? formData.fixedWorkStartTime : undefined,
            fixedWorkEndTime: formData.workScheduleType === 'SABIT_MESAI' ? formData.fixedWorkEndTime : undefined,
            fixedWorkOffDay: formData.workScheduleType === 'SABIT_MESAI' ? formData.fixedWorkOffDay : undefined,
            shiftSchedule: formData.workScheduleType === 'VARDIYALI_MESAI' ? formData.shiftSchedule : undefined
          })
        })
      } else {
        // Yeni oluştur
        response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
            fullName: formData.fullName,
            phone: formData.phone || undefined,
            role: formData.role,
            staffDuty: formData.role === 'STAFF' ? formData.staffDuty : undefined,
            branchId: formData.role === 'SUPERVIZOR' ? undefined : formData.branchId,
            managerId: formData.role === 'SUPERVIZOR' ? undefined : formData.managerId,
            workScheduleType: formData.workScheduleType || undefined,
            fixedWorkStartTime: formData.workScheduleType === 'SABIT_MESAI' ? formData.fixedWorkStartTime : undefined,
            fixedWorkEndTime: formData.workScheduleType === 'SABIT_MESAI' ? formData.fixedWorkEndTime : undefined,
            fixedWorkOffDay: formData.workScheduleType === 'SABIT_MESAI' ? formData.fixedWorkOffDay : undefined,
            shiftSchedule: formData.workScheduleType === 'VARDIYALI_MESAI' ? formData.shiftSchedule : undefined
          })
        })
      }

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess(editingUser ? 'Kullanıcı başarıyla güncellendi' : 'Kullanıcı başarıyla oluşturuldu')
        setIsModalOpen(false)
        fetchUsers() // Kullanıcı listesini yenile
        fetchBranchesAndManagers() // Managers listesini de yenile (yeni yönetici eklendiyse görünsün)
        
        // Başarı mesajını 3 saniye sonra temizle
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'İşlem başarısız oldu')
      }
    } catch (err) {
      console.error('Error saving user:', err)
      setError('İşlem sırasında bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  // Silme modal'ını aç
  const handleDeleteUser = (user: User) => {
    setDeletingUser(user)
    setIsDeleteModalOpen(true)
  }

  // Kullanıcı sil
  const confirmDelete = async () => {
    if (!deletingUser) return

    try {
      setSubmitting(true)
      setError('')
      
      const response = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSuccess('Kullanıcı başarıyla silindi')
        setIsDeleteModalOpen(false)
        setDeletingUser(null)
        fetchUsers() // Listeyi yenile
        
        // Başarı mesajını 3 saniye sonra temizle
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Kullanıcı silinirken bir hata oluştu')
      }
    } catch (err) {
      console.error('Error deleting user:', err)
      setError('Kullanıcı silinirken bir hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  // Rol badge rengi
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'SUPERVIZOR':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'STAFF':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  // Rol ikonu
  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'SUPERVIZOR':
        return <Shield className="w-4 h-4" />
      case 'MANAGER':
        return <UserCog className="w-4 h-4" />
      case 'STAFF':
        return <UserCheck className="w-4 h-4" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  // Rol adı (Türkçe)
  const getRoleName = (role: UserRole) => {
    switch (role) {
      case 'SUPERVIZOR':
        return 'Süpervizör'
      case 'MANAGER':
        return 'Yönetici'
      case 'STAFF':
        return 'Personel'
      default:
        return role
    }
  }

  // Filtrelenmiş kullanıcılar
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Kullanıcı detay modalını aç
  const handleViewDetails = async (user: User) => {
    setSelectedUser(user)
    setDetailModalOpen(true)
    setLoadingTasks(true)
    setError('')

    try {
      const response = await fetch(`/api/tasks/assigned?userId=${user.id}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setUserTasks(data.tasks || [])
      } else {
        setError(data.error || 'Görevler yüklenirken bir hata oluştu')
        setUserTasks([])
      }
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError('Görevler yüklenirken bir hata oluştu')
      setUserTasks([])
    } finally {
      setLoadingTasks(false)
    }
  }

  // Görev durumunu güncelle
  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Görev listesini güncelle
        setUserTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId
              ? { ...task, status: newStatus === 'ONAYLANDI' ? 'completed' : newStatus === 'REDDEDILDI' ? 'rejected' : 'in_progress' }
              : task
          )
        )
        setSuccess('Görev durumu başarıyla güncellendi')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.error || 'Görev güncellenirken bir hata oluştu')
      }
    } catch (err) {
      console.error('Error updating task:', err)
      setError('Görev güncellenirken bir hata oluştu')
    }
  }

  // Görev durumunu al (Türkçe)
  const getTaskStatusLabel = (status: string) => {
    if (status === 'completed' || status === 'ONAYLANDI') return 'Onaylandı'
    if (status === 'rejected' || status === 'REDDEDILDI') return 'Reddedildi'
    if (status === 'pending' || status === 'BEKLIYOR') return 'Bekliyor'
    if (status === 'in_progress' || status === 'IN_PROGRESS') return 'Devam Ediyor'
    return status
  }

  // Görev durumu rengi
  const getTaskStatusColor = (status: string) => {
    if (status === 'completed' || status === 'ONAYLANDI') return 'bg-green-100 text-green-800 border-green-300'
    if (status === 'rejected' || status === 'REDDEDILDI') return 'bg-red-100 text-red-800 border-red-300'
    if (status === 'pending' || status === 'BEKLIYOR') return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    if (status === 'in_progress' || status === 'IN_PROGRESS') return 'bg-blue-100 text-blue-800 border-blue-300'
    return 'bg-gray-100 text-gray-800 border-gray-300'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/panel/supervizor')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-800">Kullanıcı Yönetimi</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LogoutButton variant="icon" />
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mx-4 mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-6 space-y-4">
        {/* Top Bar - Search and Add Button */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Kullanıcı adı veya ad soyad ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
            />
          </div>

          {/* Add Button */}
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>Yeni Kullanıcı Ekle</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium mb-2">
                {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz kullanıcı bulunmuyor'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleOpenModal}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  İlk kullanıcıyı eklemek için tıklayın
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Kullanıcı
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Oluşturulma
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <div className="font-semibold text-gray-900">{user.fullName}</div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                          {getRoleName(user.role)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(user)}
                            className="p-2 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
                            title="Görevleri Görüntüle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title={user.role === 'SUPERVIZOR' ? 'Süpervizör kullanıcısı düzenlenebilir (rol değiştirilemez)' : 'Düzenle'}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title={user.role === 'SUPERVIZOR' ? 'Süpervizör kullanıcıları silinemez' : user.id === session?.user?.id ? 'Kendi hesabınızı silemezsiniz' : 'Sil'}
                            disabled={user.id === session?.user?.id || user.role === 'SUPERVIZOR'}
                          >
                            <Trash2 className={`w-4 h-4 ${(user.id === session?.user?.id || user.role === 'SUPERVIZOR') ? 'opacity-50 cursor-not-allowed' : ''}`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User Count */}
        <div className="text-center text-sm text-gray-500">
          Toplam {users.length} kullanıcı {searchTerm && `(${filteredUsers.length} sonuç bulundu)`}
        </div>
      </div>

      {/* Add/Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !submitting && setIsModalOpen(false)}
        title={editingUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}
        size="md"
      >
        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ad Soyad <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
              required
            />
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Kullanıcı Adı <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Küçük harf ve boşluksuz olmalı</p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Şifre {!editingUser && <span className="text-red-500">*</span>}
              {editingUser && <span className="text-gray-400 font-normal">(Boş bırakırsanız değişmez)</span>}
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value })
                    setGeneratedPassword('')
                  }}
                  placeholder={editingUser ? "Değiştirmek için yeni şifre girin" : "Şifre"}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                  required={!editingUser}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {!editingUser && (
                <>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
                    title="Otomatik Şifre Oluştur"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Oluştur</span>
                  </button>
                  {formData.password && (
                    <button
                      type="button"
                      onClick={copyPassword}
                      className={`px-3 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium ${
                        passwordCopied
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                      }`}
                      title="Şifreyi Kopyala"
                    >
                      {passwordCopied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Kopyalandı!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="hidden sm:inline">Kopyala</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 font-medium mb-1">Şifre Gereksinimleri:</p>
              <ul className="text-xs text-amber-700 space-y-0.5 list-disc list-inside">
                <li>En az 6 karakter</li>
                <li>En az bir büyük harf (A-Z)</li>
                <li>En az bir noktalama işareti (örn: !@#$%^&*()_+-=[]&#123;&#125;|;:,. vb.)</li>
              </ul>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Telefon Numarası <span className="text-gray-400 font-normal">(SMS için)</span>
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium text-sm pointer-events-none">
                +90
              </div>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => {
                  // Sadece rakamlara izin ver
                  const value = e.target.value.replace(/[^\d]/g, '')
                  // Maksimum 10 rakam (5xxXXXxxxx formatı)
                  const limitedValue = value.slice(0, 10)
                  setFormData({ ...formData, phone: limitedValue })
                }}
                placeholder="5xxXXXxxxx"
                className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">SMS doğrulama için telefon numarası gereklidir (5xxXXXxxxx formatında)</p>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Rol <span className="text-red-500">*</span>
              {editingUser && editingUser.role === 'SUPERVIZOR' && (
                <span className="ml-2 text-xs text-amber-600 font-normal">(Süpervizör rolü değiştirilemez)</span>
              )}
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole, staffDuty: e.target.value !== 'STAFF' ? '' : formData.staffDuty })}
              className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm ${
                editingUser && editingUser.role === 'SUPERVIZOR' ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
              required
              disabled={!!(editingUser && editingUser.role === 'SUPERVIZOR')}
            >
              <option value="STAFF">Personel</option>
              <option value="MANAGER">Yönetici</option>
              {editingUser && editingUser.role === 'SUPERVIZOR' && <option value="SUPERVIZOR">Süpervizör</option>}
            </select>
            {!editingUser && (
              <p className="mt-1 text-xs text-amber-600 font-medium">⚠️ Süpervizör rolü yeni kullanıcı oluştururken seçilemez</p>
            )}
            {editingUser && editingUser.role === 'SUPERVIZOR' && (
              <p className="mt-1 text-xs text-amber-600 font-medium">⚠️ Süpervizör kullanıcısının rolü değiştirilemez</p>
            )}
          </div>

          {/* Şube Seçimi - Süpervizör için gösterilmez */}
          {formData.role !== 'SUPERVIZOR' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Şube {!editingUser && <span className="text-red-500">*</span>}
              </label>
              <select
                value={formData.branchId}
                onChange={(e) => {
                  const selectedBranch = branches.find(b => b.id === e.target.value)
                  setFormData({ 
                    ...formData, 
                    branchId: e.target.value,
                    // Şube seçildiğinde, o şubenin ilk manager'ını otomatik seç (eğer varsa)
                    managerId: selectedBranch?.managers && selectedBranch.managers.length > 0 
                      ? selectedBranch.managers[0].id 
                      : formData.managerId
                  })
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                required={!editingUser}
                disabled={loadingBranches}
              >
                <option value="">Seçiniz...</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              {loadingBranches && (
                <p className="mt-1 text-xs text-gray-500">Şubeler yükleniyor...</p>
              )}
            </div>
          )}

          {/* Süpervizör için bilgilendirme */}
          {formData.role === 'SUPERVIZOR' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs text-blue-800">
                ℹ️ Süpervizör kullanıcıları şubeye bağlı değildir ve tüm şubeleri görüntüleyebilir.
              </p>
            </div>
          )}

          {/* Yönetici Seçimi - Süpervizör için gösterilmez */}
          {formData.role !== 'SUPERVIZOR' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Bağlı Bulunduğu Yönetici {!editingUser && <span className="text-red-500">*</span>}
              </label>
              <select
                value={formData.managerId}
                onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                required={!editingUser}
              >
                <option value="">Seçiniz...</option>
                {managers
                  .filter((manager) => {
                    // Hiyerarşi yapısı:
                    // - SUPERVIZOR -> kimseye bağlı değil
                    // - MANAGER -> sadece SUPERVIZOR'a bağlı olabilir
                    // - STAFF/DEVELOPER/KASIYER -> MANAGER'a bağlı olabilir
                    if (formData.role === 'MANAGER') {
                      // Yönetici sadece süpervizöre bağlı olabilir
                      return manager.role === 'SUPERVIZOR'
                    }
                    // Diğer roller (STAFF, DEVELOPER, KASIYER) için sadece MANAGER göster
                    return manager.role === 'MANAGER'
                  })
                  .map((manager) => {
                    const selectedBranch = branches.find(b => b.id === formData.branchId)
                    const isBranchManager = selectedBranch?.managers?.some((m: any) => m.id === manager.id) || false
                    const roleLabel = manager.role === 'SUPERVIZOR' ? ' (Süpervizör)' : ''
                    return (
                      <option key={manager.id} value={manager.id}>
                        {manager.fullName}{roleLabel} {isBranchManager && '(Bu şubenin yöneticisi)'}
                      </option>
                    )
                  })}
              </select>
              {formData.branchId && branches.find(b => b.id === formData.branchId)?.managers && branches.find(b => b.id === formData.branchId)!.managers.length > 0 && (
                <p className="mt-1 text-xs text-blue-600">
                  💡 Seçili şubenin yöneticisi otomatik seçildi. İsterseniz değiştirebilirsiniz.
                </p>
              )}
              {managers.filter((manager) => {
                if (formData.role === 'MANAGER') {
                  return manager.role === 'SUPERVIZOR'
                }
                return manager.role === 'MANAGER'
              }).length === 0 && (
                <p className="mt-1 text-xs text-amber-600">
                  ⚠️ {formData.role === 'MANAGER' 
                    ? 'Henüz süpervizör kullanıcı bulunmuyor. Yöneticiler sadece süpervizöre bağlı olabilir.'
                    : 'Henüz yönetici kullanıcı bulunmuyor. Önce bir yönetici oluşturun.'}
                </p>
              )}
            </div>
          )}

          {/* Personel Görevi - Sadece Personel rolü seçildiğinde görünür */}
          {formData.role === 'STAFF' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Personel Görevi <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.staffDuty}
                onChange={(e) => setFormData({ ...formData, staffDuty: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                required
              >
                <option value="">Seçiniz...</option>
                <option value="Satınalma">Satınalma</option>
                <option value="Yazılımcı">Yazılımcı</option>
                <option value="Kasiyer">Kasiyer</option>
                <option value="Kurye">Kurye</option>
              </select>
            </div>
          )}

          {/* Mesai Türü */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mesai Türü
            </label>
            <select
              value={formData.workScheduleType}
              onChange={(e) => {
                const newType = e.target.value
                setFormData({ 
                  ...formData, 
                  workScheduleType: newType,
                  // Mesai türü değiştiğinde ilgili alanları temizle
                  fixedWorkStartTime: newType !== 'SABIT_MESAI' ? '' : formData.fixedWorkStartTime,
                  fixedWorkEndTime: newType !== 'SABIT_MESAI' ? '' : formData.fixedWorkEndTime,
                  fixedWorkOffDay: newType !== 'SABIT_MESAI' ? '' : formData.fixedWorkOffDay,
                  shiftSchedule: newType !== 'VARDIYALI_MESAI' ? '' : formData.shiftSchedule
                })
                if (newType !== 'VARDIYALI_MESAI') {
                  setShiftScheduleDays({})
                }
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
            >
              <option value="">Seçiniz...</option>
              <option value="SABIT_MESAI">Sabit Mesai</option>
              <option value="VARDIYALI_MESAI">Vardiyalı Mesai</option>
            </select>
          </div>

          {/* Sabit Mesai Alanları */}
          {formData.workScheduleType === 'SABIT_MESAI' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Başlama Saati <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.fixedWorkStartTime}
                  onChange={(e) => setFormData({ ...formData, fixedWorkStartTime: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bitiş Saati <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.fixedWorkEndTime}
                  onChange={(e) => setFormData({ ...formData, fixedWorkEndTime: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  İzin Günü <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.fixedWorkOffDay}
                  onChange={(e) => setFormData({ ...formData, fixedWorkOffDay: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-sm"
                  required
                >
                  <option value="">Seçiniz...</option>
                  <option value="Pazartesi">Pazartesi</option>
                  <option value="Salı">Salı</option>
                  <option value="Çarşamba">Çarşamba</option>
                  <option value="Perşembe">Perşembe</option>
                  <option value="Cuma">Cuma</option>
                  <option value="Cumartesi">Cumartesi</option>
                  <option value="Pazar">Pazar</option>
                </select>
              </div>
            </>
          )}

          {/* Vardiyalı Mesai Alanları */}
          {formData.workScheduleType === 'VARDIYALI_MESAI' && (() => {
            // Get tomorrow and next 7 days (excluding today and past dates)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const tomorrow = new Date(today)
            tomorrow.setDate(today.getDate() + 1)
            
            const weekDays = []
            const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']
            
            for (let i = 0; i < 7; i++) {
              const date = new Date(tomorrow)
              date.setDate(tomorrow.getDate() + i)
              const dayIndex = date.getDay()
              const dayName = dayNames[dayIndex === 0 ? 6 : dayIndex - 1] // Adjust for Monday = 0
              weekDays.push({
                date,
                dayName
              })
            }

            const shiftTypes = [
              { value: '09:00-17:30', label: '09:00-17:30', color: 'bg-blue-500 hover:bg-blue-600' },
              { value: '16:30-01:00', label: '16:30-01:00', color: 'bg-purple-500 hover:bg-purple-600' },
              { value: '10:30-19:00', label: '10:30-19:00', color: 'bg-indigo-500 hover:bg-indigo-600' },
              { value: 'off', label: 'İzinli', color: 'bg-orange-500 hover:bg-orange-600' }
            ]

            const handleShiftTypeClick = (dayName: string, shiftType: string) => {
              const newSchedule = { ...shiftScheduleDays }
              // If clicking the same type, remove it (toggle off)
              if (newSchedule[dayName] === shiftType) {
                delete newSchedule[dayName]
              } else {
                newSchedule[dayName] = shiftType
              }
              setShiftScheduleDays(newSchedule)
              // Update formData.shiftSchedule as JSON string
              setFormData({ ...formData, shiftSchedule: JSON.stringify(newSchedule) })
            }

            // Check if all 7 days are selected (excluding 'off' days)
            const selectedDaysCount = Object.keys(shiftScheduleDays).filter(
              day => shiftScheduleDays[day] !== 'off'
            ).length
            const allDaysSelected = selectedDaysCount === 7
            
            // Check if 2 or more days are marked as 'off' (leave days)
            const offDaysCount = Object.keys(shiftScheduleDays).filter(
              day => shiftScheduleDays[day] === 'off'
            ).length
            const hasMultipleOffDays = offDaysCount >= 2

            return (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  1 Haftalık Vardiya Döngüsü <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {weekDays.map((day) => {
                    return (
                      <div key={`${day.dayName}-${day.date.getTime()}`} className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-700 min-w-[80px]">
                              {day.dayName}
                            </span>
                            <span className="text-xs text-gray-500">
                              {day.date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                          {shiftScheduleDays[day.dayName] && (
                            <span className="text-xs text-green-600 font-medium">
                              Seçili: {shiftScheduleDays[day.dayName] === 'off' ? 'İzinli' : shiftScheduleDays[day.dayName]}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {shiftTypes.map((shiftType) => {
                            const isSelected = shiftScheduleDays[day.dayName] === shiftType.value
                            return (
                              <button
                                key={shiftType.value}
                                type="button"
                                onClick={() => handleShiftTypeClick(day.dayName, shiftType.value)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all ${
                                  isSelected
                                    ? `${shiftType.color} ring-2 ring-offset-2 ring-blue-400 shadow-lg`
                                    : `${shiftType.color} opacity-70 hover:opacity-100`
                                }`}
                              >
                                {shiftType.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {allDaysSelected && (
                  <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-yellow-800">
                          ⚠️ Fazla Mesai Uyarısı
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          Haftanın tamamı için mesai girdiniz. Bu kişiye fazla mesai ödenmesi gerekecektir. Lütfen kontrol edin.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {hasMultipleOffDays && (
                  <div className="mt-3 bg-red-50 border border-red-300 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-red-800">
                          ⚠️ Eksik Çalışma Uyarısı
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          Personel eksik çalışacak ve eksik maaş alacak. Bunu yapmak istediğinize emin misiniz?
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  💡 Her gün için bir vardiya tipi seçin. Aynı butona tekrar tıklayarak seçimi iptal edebilirsiniz. Sadece yarın ve sonraki 7 gün gösterilmektedir.
                </p>
              </div>
            )
          })()}

          {/* Bilgilendirme Notu */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Dikkat Edilmesi Gereken Hususlar
            </h4>
            <ul className="text-xs text-amber-800 space-y-1 list-disc list-inside">
              <li>Yeni eklenen kullanıcılar sisteme ilk girişte şifrelerini değiştirmeleri konusunda uyarılmalıdır.</li>
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              İptal
            </button>
            <button
              onClick={handleSaveUser}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingUser ? 'Güncelle' : 'Oluştur'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => !submitting && setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        type="error"
        title="Kullanıcıyı Sil"
        message={
          deletingUser
            ? `${deletingUser.fullName} (${deletingUser.username}) kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
            : ''
        }
        confirmText="Sil"
        cancelText="İptal"
        loading={submitting}
      />

      {/* Personel Detay Modal - Görevler */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false)
          setSelectedUser(null)
          setUserTasks([])
          setError('')
          setSuccess('')
        }}
        title={selectedUser ? `${selectedUser.fullName} - Görevler` : 'Görevler'}
        size="lg"
      >
        <div className="space-y-4">
          {loadingTasks ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Görevler yükleniyor...</span>
            </div>
          ) : userTasks.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Bu kullanıcıya ait görev bulunmuyor</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {userTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{task.title || 'Görev Başlığı'}</h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {task.assignedAt && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Atandı: {new Date(task.assignedAt).toLocaleDateString('tr-TR')}</span>
                          </div>
                        )}
                        {task.taskType && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {task.taskType}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getTaskStatusColor(task.status)}`}>
                      {getTaskStatusLabel(task.status)}
                    </div>
                  </div>

                  {/* Durum Değiştirme Butonları */}
                  {(task.status === 'pending' || task.status === 'BEKLIYOR') && (
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, 'ONAYLANDI')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Onayla
                      </button>
                      <button
                        onClick={() => handleUpdateTaskStatus(task.id, 'REDDEDILDI')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reddet
                      </button>
                      <button
                        onClick={() => window.open(`/panel/yonetici/onay-bekleyenler/${task.id}`, '_blank')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detay
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              <span>{success}</span>
            </div>
          )}

          {/* Close Button */}
          <div className="flex items-center justify-end pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                setDetailModalOpen(false)
                setSelectedUser(null)
                setUserTasks([])
                setError('')
                setSuccess('')
              }}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              Kapat
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
