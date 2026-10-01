# Staff routes live under a `staff/` URL segment, not a `(staff)` group

Expo Router groups do not change URLs, so a `(patient)` group and a `(staff)` group would both claim `/`, `/queue` and any other shared name. Patient routes keep the `(patient)` group (they own `/`), and staff routes use a real `staff/` segment (`/staff`, `/staff/queue`, …). This keeps deep links unambiguous and lets role guards target a path prefix.
