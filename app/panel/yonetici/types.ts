export interface Staff {
  id: string
  name: string
  surname: string
  role: string
  displayRole?: string
  staffDuty?: string | null
  branchId?: string | null
  branchName?: string | null
  shiftActive: boolean
  lastLocation: string
  shiftStartTime?: string | null
  shiftEndTime?: string | null
  loginTime?: string | null
  loginTimeRaw?: string | null
  logoutTime?: string | null
  logoutTimeRaw?: string | null
  onLeave?: boolean
  totalTasks: number
  pendingApprovals: number
  incompleteTasks: number
  successRate: number
  workScheduleType?: string | null
  workScheduleTypeDisplay?: string
  shiftStartTimeDisplay?: string
  workEndTimeDisplay?: string
  fixedWorkStartTime?: string | null
  fixedWorkEndTime?: string | null
  fixedWorkOffDay?: string | null
  shiftSchedule?: any | null
  isBeingMonitored?: boolean
  avatar?: string
}

export interface ApprovalItem {
  id: string
  staffName: string
  staffRole: string
  taskType: string
  taskTitle: string
  submittedAt: string
  data?: any
  photos?: string[]
  status: 'pending' | 'approved' | 'rejected'
}

export interface TaskAssignment {
  staffId: string
  taskType: 'routine' | 'one-time'
  urgency: 'normal' | 'urgent'
  description: string
}

export interface LocationTracking {
  id: string
  staffId: string
  name: string
  surname: string
  role: string
  lat: number
  lng: number
  batteryLevel: number
  speed: number
  lastUpdate: string
  isMoving: boolean
  currentTask?: string
  eta?: string
}

// Mock Data
export const mockStaffList: Staff[] = [
  { 
    id: '1', 
    name: 'Müslüm', 
    surname: 'DİLDAŞ',
    role: 'Satınalma', 
    shiftActive: true, 
    lastLocation: 'Ofis - Merkez Şube',
    shiftStartTime: '08:30',
    totalTasks: 15,
    pendingApprovals: 2,
    incompleteTasks: 3,
    successRate: 87.5
  },
  { 
    id: '2', 
    name: 'Ahmet', 
    surname: 'Yılmaz',
    role: 'Garson', 
    shiftActive: false, 
    lastLocation: 'Restoran - Şube 1',
    shiftEndTime: '18:00',
    totalTasks: 22,
    pendingApprovals: 1,
    incompleteTasks: 2,
    successRate: 91.0
  },
  { 
    id: '3', 
    name: 'Ayşe', 
    surname: 'Demir',
    role: 'Kasiyer', 
    shiftActive: true, 
    lastLocation: 'Kasalar - Şube 2',
    shiftStartTime: '09:00',
    totalTasks: 18,
    pendingApprovals: 0,
    incompleteTasks: 4,
    successRate: 77.8
  },
  { 
    id: '4', 
    name: 'Mehmet', 
    surname: 'Kaya',
    role: 'Depo', 
    shiftActive: false, 
    lastLocation: 'Depo - Merkez',
    onLeave: true,
    totalTasks: 12,
    pendingApprovals: 1,
    incompleteTasks: 1,
    successRate: 91.7
  },
  { 
    id: '5', 
    name: 'Fatma', 
    surname: 'Şahin',
    role: 'Kurye', 
    shiftActive: true, 
    lastLocation: 'Yolda - Teslimat',
    shiftStartTime: '07:00',
    totalTasks: 28,
    pendingApprovals: 3,
    incompleteTasks: 5,
    successRate: 82.1
  },
]

export const mockApprovalItems: ApprovalItem[] = [
  {
    id: '1',
    staffName: 'Müslüm DİLDAŞ',
    staffRole: 'Satınalma',
    taskType: 'Fiyat Araştırması',
    taskTitle: 'Rakip Fiyat Araştırması - Migros',
    submittedAt: '14:20 - 15 dakika önce',
    data: { rows: 5, margin: 12.5 },
    photos: [],
    status: 'pending'
  },
  {
    id: '2',
    staffName: 'Ahmet Yılmaz',
    staffRole: 'Garson',
    taskType: 'Günlük Faaliyet',
    taskTitle: 'Günlük Rapor - 15 Ocak',
    submittedAt: '13:45 - 1 saat önce',
    photos: ['/photo1.jpg', '/photo2.jpg'],
    status: 'pending'
  },
  {
    id: '3',
    staffName: 'Ayşe Demir',
    staffRole: 'Kasiyer',
    taskType: 'Reyon Kontrolü',
    taskTitle: 'Şekerleme Reyonu Kontrolü',
    submittedAt: '12:30 - 2 saat önce',
    photos: ['/photo3.jpg'],
    status: 'pending'
  },
  {
    id: '4',
    staffName: 'Fatma Şahin',
    staffRole: 'Kurye',
    taskType: 'Teslimat Raporu',
    taskTitle: 'Bölge 3 Teslimat Raporu',
    submittedAt: '11:15 - 3 saat önce',
    photos: [],
    data: { deliveries: 12, completed: 11 },
    status: 'pending'
  }
]

// Helper Functions
export const getShiftStatus = (staff: Staff): string => {
  if (staff.onLeave) {
    return 'İzinli'
  }
  if (staff.shiftActive && staff.shiftStartTime) {
    return `Çalışıyor (Giriş: ${staff.shiftStartTime})`
  }
  if (!staff.shiftActive && staff.shiftEndTime) {
    return `Mesai Bitti (Çıkış: ${staff.shiftEndTime})`
  }
  return staff.shiftActive ? 'Çalışıyor' : 'Kapalı'
}

export const getShiftStatusColor = (staff: Staff): string => {
  if (staff.onLeave) {
    return 'bg-blue-100 text-blue-800'
  }
  if (staff.shiftActive) {
    return 'bg-green-100 text-green-800'
  }
  return 'bg-gray-100 text-gray-800'
}

// Mock Tracking Data
export const mockTrackingData: LocationTracking[] = [
  {
    id: '1',
    staffId: '5',
    name: 'Fatma',
    surname: 'Şahin',
    role: 'Kurye',
    lat: 41.0082,
    lng: 28.9784,
    batteryLevel: 85,
    speed: 45,
    lastUpdate: '2 dakika önce',
    isMoving: true,
    currentTask: 'Siparişe Gidiyor',
    eta: '5 dk'
  },
  {
    id: '2',
    staffId: '1',
    name: 'Müslüm',
    surname: 'DİLDAŞ',
    role: 'Satınalma',
    lat: 41.0123,
    lng: 28.9756,
    batteryLevel: 92,
    speed: 0,
    lastUpdate: '5 dakika önce',
    isMoving: false,
    currentTask: 'Fiyat Araştırması',
    eta: undefined
  },
  {
    id: '3',
    staffId: '3',
    name: 'Ayşe',
    surname: 'Demir',
    role: 'Kasiyer',
    lat: 41.0098,
    lng: 28.9821,
    batteryLevel: 78,
    speed: 0,
    lastUpdate: '1 dakika önce',
    isMoving: false,
    currentTask: 'Kasada',
    eta: undefined
  },
  {
    id: '4',
    staffId: '6',
    name: 'Can',
    surname: 'Özkan',
    role: 'Kurye',
    lat: 41.0156,
    lng: 28.9701,
    batteryLevel: 65,
    speed: 35,
    lastUpdate: '1 dakika önce',
    isMoving: true,
    currentTask: 'Teslimata Gidiyor',
    eta: '8 dk'
  }
]

// Merkez Şube Konumu
export const centerLocation = {
  lat: 41.0100,
  lng: 28.9800,
  name: 'Merkez Şube'
}

// Süpervizör için Interface'ler
export interface Branch {
  id: string
  name: string
  totalStaff: number
  criticalPending: number
  activeRate: number
  managers: Array<{
    id: string
    name: string
  }>
  onLeaveNames?: string[]
  activeNames?: string[]
}

export interface ManagerAudit {
  id: string
  name: string
  branch: string
  avgApprovalTime: number
  rejectionRate: number
  overriddenDecisions: number
  totalDecisions: number
  successRate: number
}

export interface SystemLog {
  id: string
  timestamp: string
  type: 'task_created' | 'task_assigned' | 'task_completed' | 'task_submitted' | 'task_approved' | 'task_rejected' | 
        'location_violation' | 'manager_approval' | 'manager_rejection' | 'supervisor_override' | 
        'system_change' | 'user_created' | 'user_updated' | 'user_deleted' |
        'shift_started' | 'shift_ended' | 'login' | 'logout' | 'leave_request_created' | 'leave_request_approved' | 'leave_request_rejected'
  description: string
  staffName?: string
  staffRole?: string
  taskId?: string
  branch?: string
  branchId?: string
  userId?: string
  details?: any
}

export interface GlobalSettings {
  locationTolerance: number // metre
  delayAlarmMinutes: number // dakika
  penaltyPoints: {
    minor: number
    moderate: number
    major: number
  }
  netgsmOtpEnabled: boolean // NetGSM OTP doğrulama aktif/pasif
  netgsmAlertEnabled: boolean // NetGSM uyarı mesajı gönderimi aktif/pasif
  netgsmAlertMessage: string // NetGSM uyarı mesajı içeriği
}

// Mock Data - Süpervizör
export const mockBranches: Branch[] = [
  {
    id: '1',
    name: 'Merkez Şube',
    totalStaff: 15,
    criticalPending: 3,
    activeRate: 87.5,
    managers: [{ id: 'm1', name: 'Mehmet Yönetici' }]
  },
  {
    id: '2',
    name: 'Şube 1',
    totalStaff: 12,
    criticalPending: 1,
    activeRate: 92.0,
    managers: [{ id: 'm2', name: 'Ayşe Yönetici' }]
  },
  {
    id: '3',
    name: 'Şube 2',
    totalStaff: 10,
    criticalPending: 5,
    activeRate: 75.0,
    managers: [{ id: 'm3', name: 'Ali Yönetici' }]
  }
]

export const mockManagers: ManagerAudit[] = [
  {
    id: 'm1',
    name: 'Mehmet Yönetici',
    branch: 'Merkez Şube',
    avgApprovalTime: 8.5,
    rejectionRate: 5.2,
    overriddenDecisions: 2,
    totalDecisions: 150,
    successRate: 94.8
  },
  {
    id: 'm2',
    name: 'Ayşe Yönetici',
    branch: 'Şube 1',
    avgApprovalTime: 6.2,
    rejectionRate: 3.1,
    overriddenDecisions: 0,
    totalDecisions: 120,
    successRate: 96.9
  },
  {
    id: 'm3',
    name: 'Ali Yönetici',
    branch: 'Şube 2',
    avgApprovalTime: 12.8,
    rejectionRate: 12.5,
    overriddenDecisions: 5,
    totalDecisions: 95,
    successRate: 87.5
  }
]

export const mockSystemLogs: SystemLog[] = [
  {
    id: 'l1',
    timestamp: '2024-01-15 14:30:00',
    type: 'supervisor_override',
    description: 'Müslüm DİLDAŞ - Fiyat Araştırması görevi Süpervizör tarafından zorla onaylandı',
    staffName: 'Müslüm DİLDAŞ',
    staffRole: 'Satınalma',
    taskId: 't1',
    branch: 'Merkez Şube',
    details: { reason: 'Yönetici reddi geçersiz', originalDecision: 'rejected' }
  },
  {
    id: 'l2',
    timestamp: '2024-01-15 14:25:00',
    type: 'location_violation',
    description: 'Can Özkan - Konum toleransı aşıldı (150m)',
    staffName: 'Can Özkan',
    staffRole: 'Kurye',
    branch: 'Merkez Şube',
    details: { distance: 150, tolerance: 100 }
  },
  {
    id: 'l3',
    timestamp: '2024-01-15 14:20:00',
    type: 'manager_approval',
    description: 'Mehmet Yönetici - Ahmet Yılmaz görevini onayladı',
    staffName: 'Ahmet Yılmaz',
    staffRole: 'Garson',
    taskId: 't2',
    branch: 'Merkez Şube'
  },
  {
    id: 'l4',
    timestamp: '2024-01-15 14:15:00',
    type: 'task_created',
    description: 'Yeni görev oluşturuldu - Fiyat Araştırması',
    staffName: 'Müslüm DİLDAŞ',
    staffRole: 'Satınalma',
    taskId: 't1',
    branch: 'Merkez Şube'
  },
  {
    id: 'l5',
    timestamp: '2024-01-15 14:10:00',
    type: 'system_change',
    description: 'Sistem ayarları güncellendi - Konum toleransı: 100m → 120m',
    branch: 'Tüm Şubeler',
    details: { setting: 'locationTolerance', oldValue: 100, newValue: 120 }
  }
]

// Raporlar için Interface'ler
export interface ReportTask {
  id: string
  date: string
  staffName: string
  staffRole: string
  taskTitle: string
  taskType: string
  status: 'approved' | 'rejected' | 'pending'
  completionTime?: number // dakika
  hasEvidence: boolean
}

export interface ReportFilter {
  dateRange: 'today' | 'last7days' | 'last30days' | 'custom'
  customStartDate?: string
  customEndDate?: string
  department: 'all' | 'Satınalma' | 'Kurye' | 'Kasiyer' | 'Garson' | 'Depo'
  staffId?: string
}

// Mock Rapor Verileri
export const mockReportTasks: ReportTask[] = [
  {
    id: '1',
    date: '2024-01-15 14:20',
    staffName: 'Müslüm DİLDAŞ',
    staffRole: 'Satınalma',
    taskTitle: 'Migros Fiyat Karşılaştırması',
    taskType: 'Fiyat Araştırması',
    status: 'approved',
    completionTime: 8,
    hasEvidence: true
  },
  {
    id: '2',
    date: '2024-01-15 13:45',
    staffName: 'Ahmet Yılmaz',
    staffRole: 'Garson',
    taskTitle: 'Günlük Rapor - 15 Ocak',
    taskType: 'Günlük Faaliyet',
    status: 'approved',
    completionTime: 5,
    hasEvidence: true
  },
  {
    id: '3',
    date: '2024-01-15 12:30',
    staffName: 'Ayşe Demir',
    staffRole: 'Kasiyer',
    taskTitle: 'Şekerleme Reyonu Kontrolü',
    taskType: 'Reyon Kontrolü',
    status: 'rejected',
    completionTime: 12,
    hasEvidence: false
  },
  {
    id: '4',
    date: '2024-01-14 16:15',
    staffName: 'Fatma Şahin',
    staffRole: 'Kurye',
    taskTitle: 'Bölge 3 Teslimat Raporu',
    taskType: 'Teslimat Raporu',
    status: 'approved',
    completionTime: 15,
    hasEvidence: true
  },
  {
    id: '5',
    date: '2024-01-14 15:00',
    staffName: 'Can Özkan',
    staffRole: 'Kurye',
    taskTitle: 'Acil Teslimat - Bölge 2',
    taskType: 'Teslimat Raporu',
    status: 'rejected',
    completionTime: 25,
    hasEvidence: false
  },
  {
    id: '6',
    date: '2024-01-14 11:20',
    staffName: 'Müslüm DİLDAŞ',
    staffRole: 'Satınalma',
    taskTitle: 'Getir Fiyat Araştırması',
    taskType: 'Fiyat Araştırması',
    status: 'approved',
    completionTime: 10,
    hasEvidence: true
  }
]
