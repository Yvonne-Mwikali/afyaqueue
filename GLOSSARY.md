# AfyaQueue

AfyaQueue lets patients book hospital services and follow their place in the live service queue, and lets hospital staff run that queue.

## People

**Patient**:
A user receiving healthcare services.
_Avoid_: Client, customer, user (when the role matters)

**Staff**:
A hospital user responsible for operational patient and service flow.
_Avoid_: Admin, operator, receptionist (too narrow)

**Doctor**:
A healthcare professional who may provide one or more Services. A Doctor is not necessarily a Staff user of the app.
_Avoid_: Provider, practitioner, physician

## Services

**Service**:
A type of healthcare service a Patient can request, such as General Consultation or Oncology Consultation.
_Avoid_: Department, specialty, clinic

**DoctorService**:
The relationship stating that a particular Doctor can provide a particular Service.
_Avoid_: Assignment, capability

**Any Available Doctor**:
The Patient's choice to book a Service without selecting a specific Doctor.
_Avoid_: No preference, random doctor

## Booking

**Visit**:
A Patient's hospital visit, which may contain multiple Appointments.
_Avoid_: Encounter, session, trip

**Appointment**:
A planned reservation for a Patient to receive a specific Service at a scheduled date and time, optionally with a specific Doctor.
_Avoid_: Booking (as a noun), slot, reservation

**Cancellation**:
A Patient's withdrawal of an Appointment. A cancelled Appointment never holds a place in a Queue.
_Avoid_: Deletion, removal

## Queueing

**Check-in**:
The Patient's act of confirming arrival for an Appointment. A Patient joins a Queue only through Check-in.
_Avoid_: Arrival, sign-in, registration

**Queue**:
The operational, real-time line for one Service (or Service and Doctor) on one day.
_Avoid_: Waitlist, line

**QueueEntry**:
A Patient's active position within a Queue, created at Check-in.
_Avoid_: Ticket, token, spot

**Queue Number**:
The number identifying a QueueEntry within its Queue for that day. It is not unique across Queues or days.
_Avoid_: Ticket number, token number

**Scheduled Priority**:
The ordering advantage a Patient keeps by checking in on time for an Appointment.
_Avoid_: VIP, fast-track

**Lateness**:
A Patient checking in after their Appointment's scheduled time, which forfeits Scheduled Priority. Delays caused by the hospital are never Lateness.
_Avoid_: No-show (a different, still-undefined concept)

**Hospital-caused Delay**:
A delay originating from the hospital, including one Service in a Visit running over into a later Appointment.
_Avoid_: Patient delay

### QueueEntry states

States set by Staff or the system, never by the Patient.

**Called**: the Patient has been summoned to be served.

**In Service**: the Patient is currently being served.

**Completed**: the Service has been delivered and the QueueEntry has ended.

**Delayed**: the QueueEntry is held because of a Hospital-caused Delay.
