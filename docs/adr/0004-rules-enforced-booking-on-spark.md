# Booking and check-in are enforced by Firestore rules, not Cloud Functions

The project is on Firebase's Spark plan, and Cloud Functions require Blaze. Booking and check-in are therefore client writes that Firestore security rules fully validate.

- **Booking** is one batch: the appointment plus slot locks (`doctorSlots`, `patientSlots`). Locks can only be created, never overwritten, so conflicting bookings fail atomically, including concurrent ones.
- **Check-in** is one transaction: the appointment moves from booked to checked-in, the per-queue counter goes up by exactly one, and the entry is created with that number under the appointment's ID.

The client never chooses a queue number, position or operational status that the rules don't derive or verify.

Moving to Cloud Functions later is a repository swap (`AppointmentRepository.book`, `QueueSource.checkIn`). Screens don't change. Doing so is the way to add what rules can't do: assigning a doctor for "Any available doctor", capacity, priority ordering and rate limits. See [firebase-data-model.md](../firebase-data-model.md).
