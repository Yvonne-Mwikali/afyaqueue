import type { Doctor } from "./doctor";

export interface DoctorRepository {
  /**
   * Active doctors, each with the services it actively provides
   * (doctorServices links, rules 4–5). Display order.
   */
  listActive(hospitalId: string): Promise<Doctor[]>;
}
