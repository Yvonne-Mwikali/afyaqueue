# Business rules

The rules agreed so far. Terms follow [GLOSSARY.md](../GLOSSARY.md). Do not extend the domain beyond these without discussing it first; refine them through `/grill-with-docs` and `/domain-modeling`.

## Booking

1. A Patient books a Service.
2. Selecting a specific Doctor is optional.
3. A Patient may choose **Any Available Doctor**.
4. A Doctor can provide multiple Services.
5. A Service can be provided by multiple Doctors.
6. A Patient may have multiple Appointments during one Visit.
7. A Patient cannot have two Appointments occupying the exact same scheduled time.
8. A Doctor must not be double-booked for overlapping scheduled Appointments.

## Check-in and queue priority

9. A Patient only joins an active Queue after Check-in.
10. An on-time booking provides Scheduled Priority.
11. A Patient who checks in after their scheduled Appointment time loses Scheduled Priority and receives the next available Queue position.
12. Hospital-caused Delays must not be treated as Patient Lateness.
13. If one Service delays another Appointment within the same Visit, the later Appointment is held or handled appropriately, not automatically treated as a no-show.

## Who controls what

14. Patients control booking, Cancellation and Check-in.
15. Staff or system logic controls operational states: Called, In Service, Completed and operational Delayed states.
16. Patients cannot manually alter their Queue position.

## Queue integrity

17. Queue Numbers are scoped to the relevant active Queue and day, not globally.
18. A cancelled Appointment cannot remain in an active Queue.

## Open questions

Raised while recording the rules above; not yet decided.

- **"Exact same time" vs overlap (rules 7 and 8).** Rule 7 forbids identical start times for a Patient; rule 8 forbids _overlapping_ Appointments for a Doctor. Can a Patient hold overlapping (but not identical) Appointments? This needs Appointment durations to be defined.
- **Any Available Doctor and rule 8.** When is a Doctor attached to an Any Available Doctor Appointment: at booking, at Check-in, or when Called?
- **On-time window (rules 10 and 11).** Is there a grace period, and how early may a Patient check in?
- **Queue scope (rule 17).** Is a Queue per Service, or per Service and Doctor? Which applies when a Patient chose Any Available Doctor?
- **No-show.** Rule 13 implies a no-show concept. When is an Appointment a no-show, and who decides?
- **Rule 13 "held".** Who resolves a held Appointment, and what happens to its Scheduled Priority?
- **Walk-ins.** Can a Patient join a Queue without a prior Appointment?
