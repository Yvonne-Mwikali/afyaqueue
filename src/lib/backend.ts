import type { AdminRepository } from "@/features/admin/admin";
import { firestoreAdminRepository } from "@/features/admin/firestore-admin-repository";
import { unavailableAdminRepository } from "@/features/admin/unavailable-admin-repository";
import type { AppointmentRepository } from "@/features/appointments/appointment-repository";
import { firestoreAppointmentRepository } from "@/features/appointments/firestore-appointment-repository";
import type { AvailabilitySource } from "@/features/appointments/availability";
import { firestoreAvailabilitySource } from "@/features/appointments/firestore-availability-source";
import type { AuthService } from "@/features/auth/auth-service";
import { firestoreHospitalRepository } from "@/features/hospitals/firestore-hospital-repository";
import type { HospitalRepository } from "@/features/hospitals/hospital-repository";
import type { DoctorRepository } from "@/features/doctors/doctor-repository";
import { firestoreScheduleRepository } from "@/features/doctors/firestore-schedule-repository";
import type { ScheduleRepository } from "@/features/doctors/schedule-repository";
import { firestoreDoctorRepository } from "@/features/doctors/firestore-doctor-repository";
import { firebaseAuthService } from "@/features/auth/firebase-auth-service";
import { firestoreServiceRepository } from "@/features/services/firestore-service-repository";
import { firestoreNotificationRepository } from "@/features/notifications/firestore-notification-repository";
import type { NotificationRepository } from "@/features/notifications/notification";
import { unavailableNotificationRepository } from "@/features/notifications/unavailable-notification-repository";
import { firestoreQueueSource } from "@/features/queues/firestore-queue-source";
import type { QueueSource } from "@/features/queues/queue-source";
import type { ServiceRepository } from "@/features/services/service-repository";
import { firestoreStaffQueueRepository } from "@/features/staff/firestore-staff-queue-repository";
import type { StaffQueueRepository } from "@/features/staff/staff-queue";
import { unavailableStaffQueueRepository } from "@/features/staff/unavailable-staff-queue-repository";
import { firestoreUserProfileRepository } from "@/features/users/firestore-user-profile-repository";
import type { UserProfileRepository } from "@/features/users/user-profile-repository";
import { mockAppointmentRepository, mockQueueSource } from "@/mocks/appointment-store";
import { mockAuthService } from "@/mocks/auth-service";
import { mockHospitalRepository } from "@/mocks/hospitals";
import { mockAvailabilitySource } from "@/mocks/availability";
import { mockDoctorRepository } from "@/mocks/doctors";
import { mockScheduleRepository } from "@/mocks/schedules";
import { mockServiceRepository } from "@/mocks/services";
import { mockUserProfileRepository } from "@/mocks/user-profile";

import { isFirebaseConfigured } from "./firebase/config";

/**
 * Composition root for data access: Firebase when the EXPO_PUBLIC_FIREBASE_*
 * values are set, otherwise the in-memory mocks (temporary, so the app runs
 * before a Firebase project exists). Screens never import from here or from
 * Firebase directly; they use feature hooks and the session.
 *
 * Migrated to Firebase so far: authentication, user profiles, the service
 * catalog, doctors (with doctorServices) and appointments (booking, list,
 * cancel). Availability is computed on the device (see AvailabilitySource).
 * Check-in and queue entries use Firestore transactions enforced by rules
 * (queues/firestore-queue-source.ts); staff queue control comes later.
 */
export const backendMode: "firebase" | "mock" = isFirebaseConfigured ? "firebase" : "mock";

export const authService: AuthService = isFirebaseConfigured
  ? firebaseAuthService
  : mockAuthService;

export const hospitalRepository: HospitalRepository = isFirebaseConfigured
  ? firestoreHospitalRepository
  : mockHospitalRepository;

export const serviceRepository: ServiceRepository = isFirebaseConfigured
  ? firestoreServiceRepository
  : mockServiceRepository;

export const appointmentRepository: AppointmentRepository = isFirebaseConfigured
  ? firestoreAppointmentRepository
  : mockAppointmentRepository;

export const userProfileRepository: UserProfileRepository = isFirebaseConfigured
  ? firestoreUserProfileRepository
  : mockUserProfileRepository;

export const doctorRepository: DoctorRepository = isFirebaseConfigured
  ? firestoreDoctorRepository
  : mockDoctorRepository;

export const scheduleRepository: ScheduleRepository = isFirebaseConfigured
  ? firestoreScheduleRepository
  : mockScheduleRepository;

export const availabilitySource: AvailabilitySource = isFirebaseConfigured
  ? firestoreAvailabilitySource
  : mockAvailabilitySource;

export const staffQueueRepository: StaffQueueRepository = isFirebaseConfigured
  ? firestoreStaffQueueRepository
  : unavailableStaffQueueRepository;

export const adminRepository: AdminRepository = isFirebaseConfigured
  ? firestoreAdminRepository
  : unavailableAdminRepository;

export const notificationRepository: NotificationRepository = isFirebaseConfigured
  ? firestoreNotificationRepository
  : unavailableNotificationRepository;

export const queueSource: QueueSource = isFirebaseConfigured
  ? firestoreQueueSource
  : mockQueueSource;

if (__DEV__ && !isFirebaseConfigured) {
  console.info("[AfyaQueue] Firebase not configured; using mock auth and services.");
}
